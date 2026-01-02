import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Search, Users, TrendingUp, Eye, MessageSquare, Plus } from "lucide-react";

const mockCompetitors = [
  {
    id: "1",
    handle: "@inkedstudio",
    platform: "Instagram",
    followers: 45000,
    engagementRate: 5.2,
    postingFrequency: 1.4,
    topHashtags: ["#tattoo", "#inked", "#tattooart"],
    sentiment: 0.85,
  },
  {
    id: "2",
    handle: "@tattoomaster",
    platform: "Instagram",
    followers: 32000,
    engagementRate: 4.8,
    postingFrequency: 2.1,
    topHashtags: ["#tattooist", "#inkwork", "#traditionaltattoo"],
    sentiment: 0.78,
  },
  {
    id: "3",
    handle: "@artoftattoo",
    platform: "TikTok",
    followers: 89000,
    engagementRate: 8.5,
    postingFrequency: 3.2,
    topHashtags: ["#tattootok", "#satisfying", "#art"],
    sentiment: 0.92,
  },
];

const CompetitorAnalysisModule = () => {
  const [searchQuery, setSearchQuery] = useState("");
  const [competitors] = useState(mockCompetitors);

  const filteredCompetitors = competitors.filter(c =>
    c.handle.toLowerCase().includes(searchQuery.toLowerCase())
  );

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
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredCompetitors.map((competitor) => (
          <Card key={competitor.id} className="bg-card/50 backdrop-blur-sm border-border/50">
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <CardTitle className="text-lg">{competitor.handle}</CardTitle>
                <Badge variant="outline">{competitor.platform}</Badge>
              </div>
              <CardDescription>Last analyzed: 2 hours ago</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Metrics */}
              <div className="grid grid-cols-2 gap-3">
                <div className="flex items-center gap-2">
                  <Users className="h-4 w-4 text-muted-foreground" />
                  <div>
                    <p className="text-sm font-medium">{(competitor.followers / 1000).toFixed(1)}K</p>
                    <p className="text-xs text-muted-foreground">Followers</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <TrendingUp className="h-4 w-4 text-muted-foreground" />
                  <div>
                    <p className="text-sm font-medium">{competitor.engagementRate}%</p>
                    <p className="text-xs text-muted-foreground">Engagement</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Eye className="h-4 w-4 text-muted-foreground" />
                  <div>
                    <p className="text-sm font-medium">{competitor.postingFrequency}/day</p>
                    <p className="text-xs text-muted-foreground">Posts</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <MessageSquare className="h-4 w-4 text-muted-foreground" />
                  <div>
                    <p className="text-sm font-medium">{(competitor.sentiment * 100).toFixed(0)}%</p>
                    <p className="text-xs text-muted-foreground">Sentiment</p>
                  </div>
                </div>
              </div>

              {/* Sentiment Bar */}
              <div className="space-y-1">
                <p className="text-xs text-muted-foreground">Audience Sentiment</p>
                <Progress value={competitor.sentiment * 100} className="h-2" />
              </div>

              {/* Top Hashtags */}
              <div className="space-y-2">
                <p className="text-xs text-muted-foreground">Top Hashtags</p>
                <div className="flex flex-wrap gap-1">
                  {competitor.topHashtags.map((tag) => (
                    <Badge key={tag} variant="secondary" className="text-xs">
                      {tag}
                    </Badge>
                  ))}
                </div>
              </div>

              <Button variant="outline" size="sm" className="w-full">
                View Full Analysis
              </Button>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
};

export default CompetitorAnalysisModule;
