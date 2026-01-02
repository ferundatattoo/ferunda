import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Search, Users, TrendingUp, Eye, MessageSquare, Plus, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";
import { Json } from "@/integrations/supabase/types";
import { formatDistanceToNow } from "date-fns";

interface Competitor {
  id: string;
  competitor_handle: string;
  platform: string;
  follower_count: number | null;
  engagement_rate: number | null;
  posting_frequency: number | null;
  sentiment_score: number | null;
  top_hashtags: Json | null;
  analyzed_at: string | null;
}

const CompetitorAnalysisModule = () => {
  const [searchQuery, setSearchQuery] = useState("");

  const { data: competitors = [], isLoading } = useQuery({
    queryKey: ['marketing-competitors'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('marketing_competitor_analysis')
        .select('*')
        .order('analyzed_at', { ascending: false })
        .limit(20);

      if (error) throw error;
      return (data || []) as Competitor[];
    },
  });

  const filteredCompetitors = competitors.filter(c =>
    c.competitor_handle.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const parseHashtags = (hashtags: Json | null): string[] => {
    if (Array.isArray(hashtags)) {
      return hashtags.filter(h => typeof h === 'string') as string[];
    }
    return [];
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Competitor Analysis</h1>
          <p className="text-muted-foreground">Monitor and analyze your competition</p>
        </div>
        <Button className="gap-2">
          <Plus className="h-4 w-4" />
          Add Competitor
        </Button>
      </div>

      {/* Search */}
      <div className="relative max-w-md">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Search competitors..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="pl-10"
        />
      </div>

      {/* Competitors Grid */}
      {filteredCompetitors.length === 0 ? (
        <Card className="bg-card/50 backdrop-blur-sm border-border/50">
          <CardContent className="py-12 text-center">
            <Users className="h-12 w-12 mx-auto text-muted-foreground/50 mb-4" />
            <h3 className="text-lg font-medium mb-2">No competitors tracked</h3>
            <p className="text-muted-foreground mb-4">Add competitors to start monitoring their performance</p>
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              Add Competitor
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredCompetitors.map((competitor) => {
            const hashtags = parseHashtags(competitor.top_hashtags);
            
            return (
              <Card key={competitor.id} className="bg-card/50 backdrop-blur-sm border-border/50">
                <CardHeader className="pb-2">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-lg">{competitor.competitor_handle}</CardTitle>
                    <Badge variant="outline">{competitor.platform}</Badge>
                  </div>
                  <CardDescription>
                    {competitor.analyzed_at 
                      ? `Analyzed ${formatDistanceToNow(new Date(competitor.analyzed_at), { addSuffix: true })}`
                      : 'Not analyzed yet'
                    }
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  {/* Metrics */}
                  <div className="grid grid-cols-2 gap-3">
                    <div className="flex items-center gap-2">
                      <Users className="h-4 w-4 text-muted-foreground" />
                      <div>
                        <p className="text-sm font-medium">
                          {competitor.follower_count 
                            ? `${(competitor.follower_count / 1000).toFixed(1)}K`
                            : '—'
                          }
                        </p>
                        <p className="text-xs text-muted-foreground">Followers</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <TrendingUp className="h-4 w-4 text-muted-foreground" />
                      <div>
                        <p className="text-sm font-medium">
                          {competitor.engagement_rate ? `${competitor.engagement_rate}%` : '—'}
                        </p>
                        <p className="text-xs text-muted-foreground">Engagement</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Eye className="h-4 w-4 text-muted-foreground" />
                      <div>
                        <p className="text-sm font-medium">
                          {competitor.posting_frequency ? `${competitor.posting_frequency}/day` : '—'}
                        </p>
                        <p className="text-xs text-muted-foreground">Posts</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <MessageSquare className="h-4 w-4 text-muted-foreground" />
                      <div>
                        <p className="text-sm font-medium">
                          {competitor.sentiment_score ? `${(competitor.sentiment_score * 100).toFixed(0)}%` : '—'}
                        </p>
                        <p className="text-xs text-muted-foreground">Sentiment</p>
                      </div>
                    </div>
                  </div>

                  {/* Sentiment Bar */}
                  {competitor.sentiment_score && (
                    <div className="space-y-1">
                      <p className="text-xs text-muted-foreground">Audience Sentiment</p>
                      <Progress value={competitor.sentiment_score * 100} className="h-2" />
                    </div>
                  )}

                  {/* Top Hashtags */}
                  {hashtags.length > 0 && (
                    <div className="space-y-2">
                      <p className="text-xs text-muted-foreground">Top Hashtags</p>
                      <div className="flex flex-wrap gap-1">
                        {hashtags.slice(0, 5).map((tag) => (
                          <Badge key={tag} variant="secondary" className="text-xs">
                            {tag}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  )}

                  <Button variant="outline" size="sm" className="w-full">
                    View Full Analysis
                  </Button>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default CompetitorAnalysisModule;
