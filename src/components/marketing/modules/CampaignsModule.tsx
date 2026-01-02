import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Megaphone, Plus, Play, Pause, MoreHorizontal, Calendar, DollarSign, Target } from "lucide-react";

interface Campaign {
  id: string;
  name: string;
  status: "draft" | "scheduled" | "active" | "paused" | "completed";
  type: string;
  platforms: string[];
  startDate: string;
  endDate: string;
  budget: number;
  spent: number;
  reach: number;
  engagement: number;
}

const mockCampaigns: Campaign[] = [
  {
    id: "1",
    name: "Summer Flash Sale",
    status: "active",
    type: "Promotion",
    platforms: ["Instagram", "Facebook"],
    startDate: "2024-01-15",
    endDate: "2024-02-15",
    budget: 500,
    spent: 234,
    reach: 45000,
    engagement: 3200,
  },
  {
    id: "2",
    name: "Artist Spotlight Series",
    status: "scheduled",
    type: "Content",
    platforms: ["Instagram", "TikTok"],
    startDate: "2024-02-01",
    endDate: "2024-03-01",
    budget: 300,
    spent: 0,
    reach: 0,
    engagement: 0,
  },
  {
    id: "3",
    name: "Holiday Special",
    status: "completed",
    type: "Promotion",
    platforms: ["Instagram", "Facebook", "Twitter"],
    startDate: "2023-12-01",
    endDate: "2023-12-31",
    budget: 800,
    spent: 780,
    reach: 128000,
    engagement: 8900,
  },
];

const statusColors = {
  draft: "bg-muted text-muted-foreground",
  scheduled: "bg-blue-500/20 text-blue-500",
  active: "bg-green-500/20 text-green-500",
  paused: "bg-yellow-500/20 text-yellow-500",
  completed: "bg-purple-500/20 text-purple-500",
};

const CampaignsModule = () => {
  const [campaigns] = useState<Campaign[]>(mockCampaigns);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Campaigns</h1>
          <p className="text-muted-foreground">Manage your marketing campaigns</p>
        </div>
        <Button className="gap-2">
          <Plus className="h-4 w-4" />
          New Campaign
        </Button>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="bg-card/50 backdrop-blur-sm border-border/50">
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-green-500/10">
                <Play className="h-5 w-5 text-green-500" />
              </div>
              <div>
                <p className="text-2xl font-bold">{campaigns.filter(c => c.status === "active").length}</p>
                <p className="text-sm text-muted-foreground">Active Campaigns</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="bg-card/50 backdrop-blur-sm border-border/50">
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-primary/10">
                <DollarSign className="h-5 w-5 text-primary" />
              </div>
              <div>
                <p className="text-2xl font-bold">
                  ${campaigns.reduce((sum, c) => sum + c.spent, 0).toLocaleString()}
                </p>
                <p className="text-sm text-muted-foreground">Total Spent</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="bg-card/50 backdrop-blur-sm border-border/50">
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-blue-500/10">
                <Target className="h-5 w-5 text-blue-500" />
              </div>
              <div>
                <p className="text-2xl font-bold">
                  {(campaigns.reduce((sum, c) => sum + c.reach, 0) / 1000).toFixed(1)}K
                </p>
                <p className="text-sm text-muted-foreground">Total Reach</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Campaign List */}
      <div className="space-y-4">
        {campaigns.map((campaign) => (
          <Card key={campaign.id} className="bg-card/50 backdrop-blur-sm border-border/50">
            <CardContent className="pt-6">
              <div className="flex items-start justify-between">
                <div className="space-y-1">
                  <div className="flex items-center gap-3">
                    <h3 className="text-lg font-semibold">{campaign.name}</h3>
                    <Badge variant="outline" className={statusColors[campaign.status]}>
                      {campaign.status}
                    </Badge>
                  </div>
                  <div className="flex items-center gap-4 text-sm text-muted-foreground">
                    <span className="flex items-center gap-1">
                      <Megaphone className="h-3 w-3" />
                      {campaign.type}
                    </span>
                    <span className="flex items-center gap-1">
                      <Calendar className="h-3 w-3" />
                      {campaign.startDate} - {campaign.endDate}
                    </span>
                  </div>
                  <div className="flex gap-1 mt-2">
                    {campaign.platforms.map(platform => (
                      <Badge key={platform} variant="secondary" className="text-xs">
                        {platform}
                      </Badge>
                    ))}
                  </div>
                </div>
                <Button variant="ghost" size="icon">
                  <MoreHorizontal className="h-4 w-4" />
                </Button>
              </div>

              {/* Budget Progress */}
              <div className="mt-4 space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Budget</span>
                  <span>${campaign.spent} / ${campaign.budget}</span>
                </div>
                <Progress value={(campaign.spent / campaign.budget) * 100} className="h-2" />
              </div>

              {/* Metrics */}
              <div className="mt-4 grid grid-cols-2 gap-4">
                <div>
                  <p className="text-xs text-muted-foreground">Reach</p>
                  <p className="text-lg font-semibold">{campaign.reach.toLocaleString()}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Engagement</p>
                  <p className="text-lg font-semibold">{campaign.engagement.toLocaleString()}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
};

export default CampaignsModule;
