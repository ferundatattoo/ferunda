import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { 
  TrendingUp, Calendar, FileText, MessageSquare, Share2,
  Eye, Heart, ArrowUpRight, Sparkles, RefreshCw, Plus,
  Instagram, Video, Image, CheckCircle, Clock, Filter,
  BarChart3, Target, Users, DollarSign, ChevronRight
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Progress } from "@/components/ui/progress";
import { cn } from "@/lib/utils";

interface ContentDraft {
  id: string;
  title: string;
  type: 'reel' | 'post' | 'story' | 'carousel';
  status: 'draft' | 'scheduled' | 'published';
  scheduledFor?: string;
  thumbnail?: string;
  platform: 'instagram' | 'tiktok' | 'both';
}

interface AttributionItem {
  id: string;
  source: string;
  sourceType: 'post' | 'reel' | 'story' | 'ad';
  client: string;
  journey: string[];
  revenue: number;
  date: string;
}

interface ContentIdea {
  id: string;
  idea: string;
  source: 'dm' | 'comment' | 'trend' | 'ai';
  votes: number;
}

export default function GrowthRedesign() {
  const [activeTab, setActiveTab] = useState('content');
  const [contentDrafts, setContentDrafts] = useState<ContentDraft[]>([]);
  const [attributions, setAttributions] = useState<AttributionItem[]>([]);
  const [ideas, setIdeas] = useState<ContentIdea[]>([]);
  const [stats, setStats] = useState({
    totalReach: 45200,
    engagement: 8.4,
    newFollowers: 234,
    leadsFromContent: 12,
    revenueFromContent: 4800
  });

  useEffect(() => {
    // Mock data
    setContentDrafts([
      { id: '1', title: 'Sacred geometry process', type: 'reel', status: 'draft', platform: 'both' },
      { id: '2', title: 'Client transformation', type: 'carousel', status: 'scheduled', scheduledFor: 'Jan 3, 2pm', platform: 'instagram' },
      { id: '3', title: 'Studio tour 2026', type: 'reel', status: 'draft', platform: 'tiktok' },
    ]);

    setAttributions([
      { id: '1', source: 'Geometric sleeve reel', sourceType: 'reel', client: 'Maria S.', journey: ['View', 'DM', 'Deposit', 'Booking'], revenue: 450, date: 'Dec 28' },
      { id: '2', source: 'Black work carousel', sourceType: 'post', client: 'Jake R.', journey: ['View', 'Save', 'DM', 'Deposit'], revenue: 350, date: 'Dec 26' },
      { id: '3', source: 'Paid ad - Sacred geometry', sourceType: 'ad', client: 'Emma L.', journey: ['Click', 'Website', 'Inquiry', 'Deposit'], revenue: 500, date: 'Dec 25' },
    ]);

    setIdeas([
      { id: '1', idea: 'Show the healing process week by week', source: 'dm', votes: 12 },
      { id: '2', idea: 'Pain scale for different body parts', source: 'comment', votes: 8 },
      { id: '3', idea: 'Design meaning explanations', source: 'ai', votes: 5 },
    ]);
  }, []);

  const getTypeIcon = (type: ContentDraft['type']) => {
    switch (type) {
      case 'reel': return <Video className="h-4 w-4" />;
      case 'story': return <Clock className="h-4 w-4" />;
      case 'carousel': return <Image className="h-4 w-4" />;
      default: return <Image className="h-4 w-4" />;
    }
  };

  const getStatusBadge = (status: ContentDraft['status']) => {
    switch (status) {
      case 'draft': return <Badge className="bg-muted text-muted-foreground">Draft</Badge>;
      case 'scheduled': return <Badge className="bg-info/10 text-info">Scheduled</Badge>;
      case 'published': return <Badge className="bg-success/10 text-success">Published</Badge>;
    }
  };

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <TrendingUp className="h-6 w-6 text-accent" />
            Growth
          </h1>
          <p className="text-muted-foreground">Content, attribution, and lead generation</p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm">
            <Filter className="h-4 w-4 mr-2" />
            Filter
          </Button>
          <Button size="sm" className="gradient-ai text-white">
            <Sparkles className="h-4 w-4 mr-2" />
            Generate Ideas
          </Button>
        </div>
      </div>

      {/* Stats Row */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2 text-muted-foreground mb-1">
              <Eye className="h-4 w-4" />
              <span className="text-xs">Total Reach</span>
            </div>
            <p className="text-xl font-bold">{(stats.totalReach / 1000).toFixed(1)}K</p>
            <div className="flex items-center gap-1 text-xs text-success">
              <ArrowUpRight className="h-3 w-3" />
              +18%
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2 text-muted-foreground mb-1">
              <Heart className="h-4 w-4" />
              <span className="text-xs">Engagement</span>
            </div>
            <p className="text-xl font-bold">{stats.engagement}%</p>
            <div className="flex items-center gap-1 text-xs text-success">
              <ArrowUpRight className="h-3 w-3" />
              +2.1%
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2 text-muted-foreground mb-1">
              <Users className="h-4 w-4" />
              <span className="text-xs">New Followers</span>
            </div>
            <p className="text-xl font-bold">+{stats.newFollowers}</p>
            <p className="text-xs text-muted-foreground">This week</p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2 text-muted-foreground mb-1">
              <Target className="h-4 w-4" />
              <span className="text-xs">Leads</span>
            </div>
            <p className="text-xl font-bold">{stats.leadsFromContent}</p>
            <p className="text-xs text-muted-foreground">From content</p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2 text-muted-foreground mb-1">
              <DollarSign className="h-4 w-4" />
              <span className="text-xs">Revenue</span>
            </div>
            <p className="text-xl font-bold">${stats.revenueFromContent.toLocaleString()}</p>
            <p className="text-xs text-muted-foreground">Attributed</p>
          </CardContent>
        </Card>
      </div>

      {/* Main Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="content">Content Drafts</TabsTrigger>
          <TabsTrigger value="calendar">Calendar</TabsTrigger>
          <TabsTrigger value="repurpose">Repurpose</TabsTrigger>
          <TabsTrigger value="community">Community</TabsTrigger>
          <TabsTrigger value="attribution">Attribution</TabsTrigger>
          <TabsTrigger value="ideas">Ideas</TabsTrigger>
        </TabsList>

        {/* Content Drafts */}
        <TabsContent value="content" className="mt-4">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            {/* Drafts Column */}
            <Card className="lg:col-span-2">
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-lg">Content Queue</CardTitle>
                  <Button size="sm">
                    <Plus className="h-4 w-4 mr-2" />
                    New Draft
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {contentDrafts.map((draft) => (
                    <motion.div
                      key={draft.id}
                      className="flex items-center gap-4 p-4 rounded-lg border border-border hover:bg-muted/30 transition-colors"
                      whileHover={{ scale: 1.01 }}
                    >
                      <div className="h-16 w-16 rounded-lg bg-muted flex items-center justify-center">
                        {getTypeIcon(draft.type)}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <p className="font-medium truncate">{draft.title}</p>
                          {getStatusBadge(draft.status)}
                        </div>
                        <div className="flex items-center gap-2 text-xs text-muted-foreground">
                          <span className="capitalize">{draft.type}</span>
                          <span>•</span>
                          <span className="capitalize">{draft.platform}</span>
                          {draft.scheduledFor && (
                            <>
                              <span>•</span>
                              <Calendar className="h-3 w-3" />
                              <span>{draft.scheduledFor}</span>
                            </>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Button variant="outline" size="sm">Edit</Button>
                        {draft.status === 'draft' && (
                          <Button size="sm">
                            <CheckCircle className="h-4 w-4 mr-2" />
                            Approve
                          </Button>
                        )}
                      </div>
                    </motion.div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Quick Actions */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-lg">Quick Actions</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <Button variant="outline" className="w-full justify-start">
                  <Video className="h-4 w-4 mr-2" />
                  Create Reel from session
                </Button>
                <Button variant="outline" className="w-full justify-start">
                  <Share2 className="h-4 w-4 mr-2" />
                  Repurpose top post
                </Button>
                <Button variant="outline" className="w-full justify-start">
                  <MessageSquare className="h-4 w-4 mr-2" />
                  Reply to comments
                </Button>
                <Button variant="outline" className="w-full justify-start gradient-ai text-white">
                  <Sparkles className="h-4 w-4 mr-2" />
                  Generate caption
                </Button>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Attribution */}
        <TabsContent value="attribution" className="mt-4">
          <Card>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-lg">Revenue Attribution</CardTitle>
                <Badge variant="secondary">{attributions.length} tracked conversions</Badge>
              </div>
            </CardHeader>
            <CardContent>
              <ScrollArea className="h-[400px]">
                <div className="space-y-4">
                  {attributions.map((attr) => (
                    <div key={attr.id} className="p-4 rounded-lg border border-border">
                      <div className="flex items-start justify-between mb-3">
                        <div>
                          <p className="font-medium">{attr.client}</p>
                          <div className="flex items-center gap-2 text-xs text-muted-foreground">
                            <Badge variant="outline" className="text-[10px]">{attr.sourceType}</Badge>
                            <span>{attr.source}</span>
                          </div>
                        </div>
                        <div className="text-right">
                          <p className="font-bold text-success">${attr.revenue}</p>
                          <p className="text-xs text-muted-foreground">{attr.date}</p>
                        </div>
                      </div>
                      
                      {/* Journey */}
                      <div className="flex items-center gap-2">
                        {attr.journey.map((step, i) => (
                          <div key={i} className="flex items-center">
                            <Badge variant="secondary" className="text-[10px]">{step}</Badge>
                            {i < attr.journey.length - 1 && (
                              <ChevronRight className="h-3 w-3 mx-1 text-muted-foreground" />
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </ScrollArea>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Ideas */}
        <TabsContent value="ideas" className="mt-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <Card>
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-lg">Content Ideas</CardTitle>
                  <Button size="sm" variant="outline">
                    <Sparkles className="h-4 w-4 mr-2" />
                    AI Suggest
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {ideas.map((idea) => (
                    <div key={idea.id} className="p-3 rounded-lg border border-border">
                      <p className="text-sm mb-2">{idea.idea}</p>
                      <div className="flex items-center justify-between">
                        <Badge variant="outline" className="text-[10px] capitalize">
                          From {idea.source}
                        </Badge>
                        <div className="flex items-center gap-2">
                          <span className="text-xs text-muted-foreground">{idea.votes} votes</span>
                          <Button variant="ghost" size="sm" className="h-7">
                            <Heart className="h-3 w-3" />
                          </Button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-lg">From DMs (Anonymized)</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div className="p-3 rounded-lg bg-muted/30 border border-border">
                    <p className="text-sm italic">"I love how you explain the meaning behind each design"</p>
                    <p className="text-xs text-muted-foreground mt-1">→ Content idea: Design meaning series</p>
                  </div>
                  <div className="p-3 rounded-lg bg-muted/30 border border-border">
                    <p className="text-sm italic">"How long does it take to heal?"</p>
                    <p className="text-xs text-muted-foreground mt-1">→ Content idea: Healing timeline guide</p>
                  </div>
                  <div className="p-3 rounded-lg bg-muted/30 border border-border">
                    <p className="text-sm italic">"What's your process for custom designs?"</p>
                    <p className="text-xs text-muted-foreground mt-1">→ Content idea: Behind the scenes design</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Other tabs - placeholders */}
        <TabsContent value="calendar" className="mt-4">
          <Card>
            <CardContent className="p-8 text-center text-muted-foreground">
              <Calendar className="h-12 w-12 mx-auto mb-3" />
              <p>Content Calendar coming soon</p>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="repurpose" className="mt-4">
          <Card>
            <CardContent className="p-8 text-center text-muted-foreground">
              <Share2 className="h-12 w-12 mx-auto mb-3" />
              <p>Repurpose Engine coming soon</p>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="community" className="mt-4">
          <Card>
            <CardContent className="p-8 text-center text-muted-foreground">
              <MessageSquare className="h-12 w-12 mx-auto mb-3" />
              <p>Community Management coming soon</p>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
