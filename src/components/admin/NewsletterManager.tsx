import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { 
  Users, Mail, Send, Plus, Search, Filter, 
  BarChart3, Tag, Trash2, Edit, Eye, Clock,
  TrendingUp, MousePointer, UserMinus, Loader2
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface Subscriber {
  id: string;
  email: string;
  name: string | null;
  status: string;
  lead_score: number;
  tags: string[];
  source: string | null;
  subscribed_at: string;
  email_count: number;
  open_count: number;
}

interface Campaign {
  id: string;
  name: string;
  subject: string;
  status: string;
  campaign_type: string;
  total_recipients: number;
  sent_count: number;
  open_count: number;
  click_count: number;
  created_at: string;
  scheduled_at: string | null;
}

const NewsletterManager = () => {
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState("subscribers");
  const [subscribers, setSubscribers] = useState<Subscriber[]>([]);
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  
  // Campaign form state
  const [isCreatingCampaign, setIsCreatingCampaign] = useState(false);
  const [campaignForm, setCampaignForm] = useState({
    name: "",
    subject: "",
    preview_text: "",
    body: "",
    campaign_type: "newsletter",
  });
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setIsLoading(true);
    try {
      const [subsRes, campRes] = await Promise.all([
        supabase.from("newsletter_subscribers").select("*").order("created_at", { ascending: false }),
        supabase.from("email_campaigns").select("*").order("created_at", { ascending: false }),
      ]);

      if (subsRes.data) setSubscribers(subsRes.data);
      if (campRes.data) setCampaigns(campRes.data);
    } catch (error) {
      console.error("Error fetching data:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const filteredSubscribers = subscribers.filter(sub => {
    const matchesSearch = sub.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         (sub.name?.toLowerCase().includes(searchQuery.toLowerCase()));
    const matchesStatus = statusFilter === "all" || sub.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const handleCreateCampaign = async () => {
    if (!campaignForm.name || !campaignForm.subject || !campaignForm.body) {
      toast({ title: "Please fill all required fields", variant: "destructive" });
      return;
    }

    setIsSaving(true);
    try {
      const { error } = await supabase.from("email_campaigns").insert({
        name: campaignForm.name,
        subject: campaignForm.subject,
        preview_text: campaignForm.preview_text,
        body: campaignForm.body,
        campaign_type: campaignForm.campaign_type,
        status: "draft",
      });

      if (error) throw error;

      toast({ title: "Campaign created successfully" });
      setCampaignForm({ name: "", subject: "", preview_text: "", body: "", campaign_type: "newsletter" });
      setIsCreatingCampaign(false);
      fetchData();
    } catch (error) {
      toast({ title: "Failed to create campaign", variant: "destructive" });
    } finally {
      setIsSaving(false);
    }
  };

  const handleSendCampaign = async (campaignId: string) => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error("Not authenticated");

      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/send-campaign`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${session.access_token}`,
          },
          body: JSON.stringify({ campaign_id: campaignId }),
        }
      );

      const result = await response.json();
      if (!response.ok) throw new Error(result.error);

      toast({ title: `Campaign sent to ${result.sent} subscribers` });
      fetchData();
    } catch (error) {
      toast({ title: "Failed to send campaign", description: error instanceof Error ? error.message : "Unknown error", variant: "destructive" });
    }
  };

  const stats = {
    total: subscribers.length,
    active: subscribers.filter(s => s.status === "active").length,
    avgScore: subscribers.length > 0 ? Math.round(subscribers.reduce((acc, s) => acc + s.lead_score, 0) / subscribers.length) : 0,
    hotLeads: subscribers.filter(s => s.lead_score > 50).length,
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="font-display text-2xl text-foreground">Marketing Hub</h2>
          <p className="text-muted-foreground font-body text-sm">Manage subscribers and email campaigns</p>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="p-4 border border-border bg-card">
          <Users className="w-5 h-5 text-muted-foreground mb-2" />
          <p className="font-display text-2xl text-foreground">{stats.total}</p>
          <p className="text-xs text-muted-foreground uppercase tracking-wider">Total Subscribers</p>
        </div>
        <div className="p-4 border border-border bg-card">
          <TrendingUp className="w-5 h-5 text-green-500 mb-2" />
          <p className="font-display text-2xl text-foreground">{stats.active}</p>
          <p className="text-xs text-muted-foreground uppercase tracking-wider">Active</p>
        </div>
        <div className="p-4 border border-border bg-card">
          <BarChart3 className="w-5 h-5 text-blue-500 mb-2" />
          <p className="font-display text-2xl text-foreground">{stats.avgScore}</p>
          <p className="text-xs text-muted-foreground uppercase tracking-wider">Avg Lead Score</p>
        </div>
        <div className="p-4 border border-border bg-card">
          <Tag className="w-5 h-5 text-orange-500 mb-2" />
          <p className="font-display text-2xl text-foreground">{stats.hotLeads}</p>
          <p className="text-xs text-muted-foreground uppercase tracking-wider">Hot Leads</p>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="bg-card border border-border">
          <TabsTrigger value="subscribers">Subscribers</TabsTrigger>
          <TabsTrigger value="campaigns">Campaigns</TabsTrigger>
        </TabsList>

        <TabsContent value="subscribers" className="mt-4">
          <div className="flex gap-4 mb-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Search subscribers..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-40">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="active">Active</SelectItem>
                <SelectItem value="unsubscribed">Unsubscribed</SelectItem>
                <SelectItem value="bounced">Bounced</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="border border-border bg-card overflow-hidden">
            <table className="w-full">
              <thead className="bg-muted/50">
                <tr>
                  <th className="text-left p-3 text-xs uppercase tracking-wider text-muted-foreground">Subscriber</th>
                  <th className="text-left p-3 text-xs uppercase tracking-wider text-muted-foreground">Status</th>
                  <th className="text-left p-3 text-xs uppercase tracking-wider text-muted-foreground">Score</th>
                  <th className="text-left p-3 text-xs uppercase tracking-wider text-muted-foreground">Tags</th>
                  <th className="text-left p-3 text-xs uppercase tracking-wider text-muted-foreground">Emails</th>
                </tr>
              </thead>
              <tbody>
                {filteredSubscribers.slice(0, 20).map((sub) => (
                  <tr key={sub.id} className="border-t border-border hover:bg-muted/30">
                    <td className="p-3">
                      <p className="font-body text-foreground">{sub.name || "—"}</p>
                      <p className="text-xs text-muted-foreground">{sub.email}</p>
                    </td>
                    <td className="p-3">
                      <Badge variant={sub.status === "active" ? "default" : "secondary"}>
                        {sub.status}
                      </Badge>
                    </td>
                    <td className="p-3">
                      <span className={`font-mono ${sub.lead_score > 50 ? "text-orange-500" : "text-muted-foreground"}`}>
                        {sub.lead_score}
                      </span>
                    </td>
                    <td className="p-3">
                      <div className="flex gap-1 flex-wrap">
                        {sub.tags?.slice(0, 2).map((tag) => (
                          <Badge key={tag} variant="outline" className="text-xs">{tag}</Badge>
                        ))}
                      </div>
                    </td>
                    <td className="p-3 text-muted-foreground text-sm">
                      {sub.email_count} sent / {sub.open_count} opened
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </TabsContent>

        <TabsContent value="campaigns" className="mt-4">
          <div className="flex justify-end mb-4">
            <Dialog open={isCreatingCampaign} onOpenChange={setIsCreatingCampaign}>
              <DialogTrigger asChild>
                <Button><Plus className="w-4 h-4 mr-2" /> New Campaign</Button>
              </DialogTrigger>
              <DialogContent className="max-w-2xl">
                <DialogHeader>
                  <DialogTitle>Create Email Campaign</DialogTitle>
                </DialogHeader>
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="text-sm text-muted-foreground">Campaign Name</label>
                      <Input
                        value={campaignForm.name}
                        onChange={(e) => setCampaignForm({ ...campaignForm, name: e.target.value })}
                        placeholder="Flash Sale January"
                      />
                    </div>
                    <div>
                      <label className="text-sm text-muted-foreground">Type</label>
                      <Select value={campaignForm.campaign_type} onValueChange={(v) => setCampaignForm({ ...campaignForm, campaign_type: v })}>
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="newsletter">Newsletter</SelectItem>
                          <SelectItem value="flash_sale">Flash Sale</SelectItem>
                          <SelectItem value="availability">Availability</SelectItem>
                          <SelectItem value="promo">Promo</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  <div>
                    <label className="text-sm text-muted-foreground">Subject Line</label>
                    <Input
                      value={campaignForm.subject}
                      onChange={(e) => setCampaignForm({ ...campaignForm, subject: e.target.value })}
                      placeholder="Limited spots available..."
                    />
                  </div>
                  <div>
                    <label className="text-sm text-muted-foreground">Preview Text</label>
                    <Input
                      value={campaignForm.preview_text}
                      onChange={(e) => setCampaignForm({ ...campaignForm, preview_text: e.target.value })}
                      placeholder="Short preview shown in inbox"
                    />
                  </div>
                  <div>
                    <label className="text-sm text-muted-foreground">Email Body (HTML)</label>
                    <Textarea
                      value={campaignForm.body}
                      onChange={(e) => setCampaignForm({ ...campaignForm, body: e.target.value })}
                      rows={8}
                      placeholder="<h2>Hello {{name}},</h2><p>Your content here...</p>"
                    />
                  </div>
                  <Button onClick={handleCreateCampaign} disabled={isSaving} className="w-full">
                    {isSaving ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
                    Create Campaign
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
          </div>

          <div className="space-y-3">
            {campaigns.map((campaign) => (
              <motion.div
                key={campaign.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="p-4 border border-border bg-card flex items-center justify-between"
              >
                <div className="flex-1">
                  <div className="flex items-center gap-3">
                    <h3 className="font-body text-foreground">{campaign.name}</h3>
                    <Badge variant={campaign.status === "sent" ? "default" : campaign.status === "draft" ? "secondary" : "outline"}>
                      {campaign.status}
                    </Badge>
                  </div>
                  <p className="text-sm text-muted-foreground mt-1">{campaign.subject}</p>
                  {campaign.status === "sent" && (
                    <div className="flex gap-4 mt-2 text-xs text-muted-foreground">
                      <span><Send className="w-3 h-3 inline mr-1" />{campaign.sent_count} sent</span>
                      <span><Eye className="w-3 h-3 inline mr-1" />{campaign.open_count} opens</span>
                      <span><MousePointer className="w-3 h-3 inline mr-1" />{campaign.click_count} clicks</span>
                    </div>
                  )}
                </div>
                <div className="flex gap-2">
                  {campaign.status === "draft" && (
                    <Button size="sm" onClick={() => handleSendCampaign(campaign.id)}>
                      <Send className="w-4 h-4 mr-1" /> Send
                    </Button>
                  )}
                </div>
              </motion.div>
            ))}
            {campaigns.length === 0 && (
              <p className="text-center text-muted-foreground py-8">No campaigns yet</p>
            )}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default NewsletterManager;
