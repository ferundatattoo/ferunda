import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { TrendingUp, TrendingDown, RefreshCw, Flame, Clock, Eye, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface Trend {
  id: string;
  topic: string;
  platform: string;
  score: number;
  change: number;
  volume: string;
  sentiment: "positive" | "negative" | "neutral";
  relatedHashtags: string[];
  peakTime: string;
}

const defaultTrends: Trend[] = [
  {
    id: "1",
    topic: "Fine Line Tattoos",
    platform: "Instagram",
    score: 95,
    change: 12,
    volume: "2.3M",
    sentiment: "positive",
    relatedHashtags: ["#fineline", "#minimalisttattoo", "#delicatetattoo"],
    peakTime: "6 PM - 9 PM",
  },
  {
    id: "2",
    topic: "Tattoo Aftercare",
    platform: "TikTok",
    score: 88,
    change: 8,
    volume: "890K",
    sentiment: "positive",
    relatedHashtags: ["#tattoocare", "#healingtattoo", "#newtattoo"],
    peakTime: "8 PM - 11 PM",
  },
  {
    id: "3",
    topic: "Traditional Flash",
    platform: "Instagram",
    score: 76,
    change: -3,
    volume: "567K",
    sentiment: "neutral",
    relatedHashtags: ["#traditionaltattoo", "#flashtattoo", "#oldschool"],
    peakTime: "12 PM - 3 PM",
  },
  {
    id: "4",
    topic: "Cover-up Tattoos",
    platform: "YouTube",
    score: 82,
    change: 15,
    volume: "1.2M",
    sentiment: "positive",
    relatedHashtags: ["#coverup", "#tattoocoverup", "#transformation"],
    peakTime: "7 PM - 10 PM",
  },
];

const sentimentColors = {
  positive: "bg-green-500/20 text-green-500",
  negative: "bg-red-500/20 text-red-500",
  neutral: "bg-gray-500/20 text-gray-500",
};

const TrendAnalysisModule = () => {
  const [trends, setTrends] = useState<Trend[]>(defaultTrends);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [lastUpdated, setLastUpdated] = useState<Date>(new Date());

  const handleRefresh = async () => {
    setIsRefreshing(true);
    try {
      const { data, error } = await supabase.functions.invoke("ai-marketing-nexus", {
        body: {
          action: "analyze_trends",
          payload: {
            industry: "tattoo",
            platforms: ["instagram", "tiktok", "youtube"],
          },
        },
      });

      if (error) throw error;

      if (data?.success && data?.data?.trends) {
        const newTrends: Trend[] = data.data.trends.map((t: any, index: number) => ({
          id: String(index + 1),
          topic: t.topic || t.name,
          platform: t.platform,
          score: t.score || Math.floor(Math.random() * 30) + 70,
          change: t.change || Math.floor(Math.random() * 20) - 5,
          volume: t.volume || `${(Math.random() * 2 + 0.5).toFixed(1)}M`,
          sentiment: t.sentiment || "positive",
          relatedHashtags: t.relatedHashtags || t.hashtags || [],
          peakTime: t.peakTime || "6 PM - 9 PM",
        }));
        setTrends(newTrends);
        setLastUpdated(new Date());
        toast.success("Trends updated successfully");
      }
    } catch (error) {
      console.error("Error fetching trends:", error);
      toast.error("Error refreshing trends");
    } finally {
      setIsRefreshing(false);
    }
  };

  const getTimeSinceUpdate = () => {
    const diff = Math.floor((Date.now() - lastUpdated.getTime()) / 1000 / 60);
    if (diff < 1) return "Just now";
    if (diff === 1) return "1 min ago";
    return `${diff} min ago`;
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Trend Analysis</h1>
          <p className="text-muted-foreground">Discover what's trending in your niche</p>
        </div>
        <Button variant="outline" className="gap-2" onClick={handleRefresh} disabled={isRefreshing}>
          {isRefreshing ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <RefreshCw className="h-4 w-4" />
          )}
          Refresh
        </Button>
      </div>

      {/* Trend Score Legend */}
      <Card className="bg-card/50 backdrop-blur-sm border-border/50">
        <CardContent className="pt-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-6">
              <div className="flex items-center gap-2">
                <Flame className="h-5 w-5 text-orange-500" />
                <span className="text-sm">90+ Hot</span>
              </div>
              <div className="flex items-center gap-2">
                <TrendingUp className="h-5 w-5 text-green-500" />
                <span className="text-sm">Rising</span>
              </div>
              <div className="flex items-center gap-2">
                <TrendingDown className="h-5 w-5 text-red-500" />
                <span className="text-sm">Declining</span>
              </div>
            </div>
            <span className="text-sm text-muted-foreground">Last updated: {getTimeSinceUpdate()}</span>
          </div>
        </CardContent>
      </Card>

      {/* Trends Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {trends.map((trend) => (
          <Card key={trend.id} className="bg-card/50 backdrop-blur-sm border-border/50">
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  {trend.score >= 90 && <Flame className="h-5 w-5 text-orange-500" />}
                  <CardTitle className="text-lg">{trend.topic}</CardTitle>
                </div>
                <Badge variant="outline">{trend.platform}</Badge>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Score & Change */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div>
                    <p className="text-3xl font-bold">{trend.score}</p>
                    <p className="text-xs text-muted-foreground">Trend Score</p>
                  </div>
                  <div className={`flex items-center gap-1 ${trend.change > 0 ? "text-green-500" : "text-red-500"}`}>
                    {trend.change > 0 ? <TrendingUp className="h-4 w-4" /> : <TrendingDown className="h-4 w-4" />}
                    <span className="font-medium">{Math.abs(trend.change)}%</span>
                  </div>
                </div>
                <Badge variant="outline" className={sentimentColors[trend.sentiment]}>
                  {trend.sentiment}
                </Badge>
              </div>

              {/* Volume & Peak Time */}
              <div className="grid grid-cols-2 gap-4">
                <div className="flex items-center gap-2">
                  <Eye className="h-4 w-4 text-muted-foreground" />
                  <div>
                    <p className="text-sm font-medium">{trend.volume}</p>
                    <p className="text-xs text-muted-foreground">Volume</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Clock className="h-4 w-4 text-muted-foreground" />
                  <div>
                    <p className="text-sm font-medium">{trend.peakTime}</p>
                    <p className="text-xs text-muted-foreground">Peak Time</p>
                  </div>
                </div>
              </div>

              {/* Related Hashtags */}
              <div className="space-y-2">
                <p className="text-xs text-muted-foreground">Related Hashtags</p>
                <div className="flex flex-wrap gap-1">
                  {trend.relatedHashtags.map((tag) => (
                    <Badge key={tag} variant="secondary" className="text-xs">
                      {tag}
                    </Badge>
                  ))}
                </div>
              </div>

              <Button variant="outline" size="sm" className="w-full">
                Create Content
              </Button>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
};

export default TrendAnalysisModule;
