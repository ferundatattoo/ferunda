import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { 
  Clock, Users, Star, Gift, MapPin, 
  Loader2, Mail, Phone, Calendar, 
  CheckCircle, XCircle, Sparkles
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { format } from "date-fns";

interface WaitlistEntry {
  id: string;
  client_email: string;
  client_name: string | null;
  client_phone: string | null;
  preferred_cities: string[] | null;
  preferred_dates: unknown | null;
  flexibility_days: number | null;
  size_preference: string | null;
  style_preference: string | null;
  tattoo_description: string | null;
  max_budget: number | null;
  status: string | null;
  match_score: number | null;
  discount_eligible: boolean | null;
  offers_sent_count: number | null;
  last_offer_sent_at: string | null;
  converted_booking_id: string | null;
  expires_at: string | null;
  created_at: string;
}

const WaitlistManager = () => {
  const [entries, setEntries] = useState<WaitlistEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedEntry, setSelectedEntry] = useState<WaitlistEntry | null>(null);
  const [sendingOffer, setSendingOffer] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    fetchWaitlist();
  }, []);

  const fetchWaitlist = async () => {
    try {
      const { data, error } = await supabase
        .from("booking_waitlist")
        .select("*")
        .order("match_score", { ascending: false })
        .limit(100);

      if (error) throw error;
      setEntries(data || []);
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to load waitlist",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const sendOffer = async (entry: WaitlistEntry, discountPercentage = 15) => {
    setSendingOffer(true);
    try {
      // Send offer via dedicated edge function (no auth required)
      const { data, error: offerError } = await supabase.functions.invoke("send-waitlist-offer", {
        body: {
          waitlist_id: entry.id,
          discount_percentage: discountPercentage,
        },
      });

      if (offerError) {
        console.error("Send offer error:", offerError);
        throw new Error("Failed to send offer");
      }

      toast({
        title: "Offer Sent! 🎉",
        description: data?.message || `Discount email sent to ${entry.client_email}`,
      });

      // Refresh the entry from server response or update locally
      setEntries((prev) =>
        prev.map((e) =>
          e.id === entry.id
            ? {
                ...e,
                offers_sent_count: (e.offers_sent_count || 0) + 1,
                last_offer_sent_at: new Date().toISOString(),
                status: "offer_sent",
              }
            : e
        )
      );
    } catch (error) {
      console.error("Send offer error:", error);
      toast({
        title: "Error",
        description: "Failed to send offer email",
        variant: "destructive",
      });
    } finally {
      setSendingOffer(false);
    }
  };

  const updateStatus = async (entry: WaitlistEntry, status: string) => {
    try {
      const { error } = await supabase
        .from("booking_waitlist")
        .update({ status })
        .eq("id", entry.id);

      if (error) throw error;

      setEntries((prev) =>
        prev.map((e) => (e.id === entry.id ? { ...e, status } : e))
      );
      setSelectedEntry((prev) => (prev?.id === entry.id ? { ...prev, status } : prev));

      toast({
        title: "Status Updated",
        description: `Entry marked as ${status}`,
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to update status",
        variant: "destructive",
      });
    }
  };

  const getMatchScoreColor = (score: number | null) => {
    if (!score) return "bg-muted text-muted-foreground";
    if (score >= 80) return "bg-emerald-500/20 text-emerald-400";
    if (score >= 50) return "bg-amber-500/20 text-amber-400";
    return "bg-muted text-muted-foreground";
  };

  const getStatusColor = (status: string | null) => {
    switch (status) {
      case "waiting":
        return "bg-blue-500/20 text-blue-400";
      case "offered":
        return "bg-amber-500/20 text-amber-400";
      case "converted":
        return "bg-emerald-500/20 text-emerald-400";
      case "expired":
        return "bg-muted text-muted-foreground";
      default:
        return "bg-muted text-muted-foreground";
    }
  };

  const waitingCount = entries.filter((e) => e.status === "waiting").length;
  const convertedCount = entries.filter((e) => e.status === "converted").length;

  if (loading) {
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
          <h2 className="font-display text-2xl text-foreground">Smart Waitlist</h2>
          <p className="text-muted-foreground text-sm mt-1">
            AI-matched cancellation fill system with automatic offers
          </p>
        </div>
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Clock className="w-4 h-4" />
          <span>{waitingCount} waiting</span>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="bg-card border-border">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-blue-500/10 rounded-lg">
                <Users className="w-5 h-5 text-blue-400" />
              </div>
              <div>
                <p className="text-2xl font-display text-foreground">{entries.length}</p>
                <p className="text-xs text-muted-foreground">Total Waitlist</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="bg-card border-border">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-emerald-500/10 rounded-lg">
                <Star className="w-5 h-5 text-emerald-400" />
              </div>
              <div>
                <p className="text-2xl font-display text-foreground">
                  {entries.filter((e) => (e.match_score || 0) >= 80).length}
                </p>
                <p className="text-xs text-muted-foreground">High Match</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="bg-card border-border">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-purple-500/10 rounded-lg">
                <Gift className="w-5 h-5 text-purple-400" />
              </div>
              <div>
                <p className="text-2xl font-display text-foreground">
                  {entries.filter((e) => e.discount_eligible).length}
                </p>
                <p className="text-xs text-muted-foreground">Discount Eligible</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="bg-card border-border">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-amber-500/10 rounded-lg">
                <CheckCircle className="w-5 h-5 text-amber-400" />
              </div>
              <div>
                <p className="text-2xl font-display text-foreground">{convertedCount}</p>
                <p className="text-xs text-muted-foreground">Converted</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Entry List */}
        <div className="lg:col-span-2 space-y-2">
          {entries.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <Clock className="w-12 h-12 mx-auto mb-4 opacity-50" />
              <p>Waitlist is empty</p>
              <p className="text-sm mt-1">Clients can join when no slots are available</p>
            </div>
          ) : (
            <AnimatePresence>
              {entries.map((entry) => (
                <motion.div
                  key={entry.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  onClick={() => setSelectedEntry(entry)}
                  className={`p-4 bg-card border rounded-lg cursor-pointer transition-colors ${
                    selectedEntry?.id === entry.id
                      ? "border-primary"
                      : "border-border hover:border-primary/50"
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-accent flex items-center justify-center">
                        <span className="font-display text-foreground">
                          {entry.client_name?.charAt(0) || entry.client_email.charAt(0).toUpperCase()}
                        </span>
                      </div>
                      <div>
                        <p className="font-body text-foreground">
                          {entry.client_name || "Unknown"}
                        </p>
                        <p className="text-sm text-muted-foreground">{entry.client_email}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      {entry.match_score && (
                        <Badge className={getMatchScoreColor(entry.match_score)}>
                          <Sparkles className="w-3 h-3 mr-1" />
                          {entry.match_score}%
                        </Badge>
                      )}
                      <Badge className={getStatusColor(entry.status)}>
                        {entry.status || "waiting"}
                      </Badge>
                      {entry.discount_eligible && (
                        <Gift className="w-4 h-4 text-purple-400" />
                      )}
                    </div>
                  </div>
                  {entry.preferred_cities && entry.preferred_cities.length > 0 && (
                    <div className="mt-2 flex items-center gap-1 text-sm text-muted-foreground">
                      <MapPin className="w-3 h-3" />
                      {entry.preferred_cities.join(", ")}
                    </div>
                  )}
                </motion.div>
              ))}
            </AnimatePresence>
          )}
        </div>

        {/* Detail Panel */}
        <div className="lg:col-span-1">
          {selectedEntry ? (
            <Card className="bg-card border-border sticky top-6">
              <CardHeader className="pb-3">
                <CardTitle className="font-display text-lg">
                  {selectedEntry.client_name || "Waitlist Entry"}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <div className="flex items-center gap-2 text-sm">
                    <Mail className="w-4 h-4 text-muted-foreground" />
                    <span className="text-foreground">{selectedEntry.client_email}</span>
                  </div>
                  {selectedEntry.client_phone && (
                    <div className="flex items-center gap-2 text-sm">
                      <Phone className="w-4 h-4 text-muted-foreground" />
                      <span className="text-foreground">{selectedEntry.client_phone}</span>
                    </div>
                  )}
                </div>

                {selectedEntry.match_score && (
                  <div className="text-center py-4 border-y border-border">
                    <p className="text-4xl font-display text-emerald-400">
                      {selectedEntry.match_score}%
                    </p>
                    <p className="text-sm text-muted-foreground mt-1">AI Match Score</p>
                  </div>
                )}

                <div className="space-y-3">
                  {selectedEntry.preferred_cities && (
                    <div>
                      <p className="text-sm text-muted-foreground mb-1">Preferred Cities</p>
                      <div className="flex gap-1 flex-wrap">
                        {selectedEntry.preferred_cities.map((city) => (
                          <Badge key={city} variant="outline" className="text-xs">
                            {city}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  )}

                  {selectedEntry.size_preference && (
                    <div>
                      <p className="text-sm text-muted-foreground mb-1">Size</p>
                      <Badge variant="secondary">{selectedEntry.size_preference}</Badge>
                    </div>
                  )}

                  {selectedEntry.style_preference && (
                    <div>
                      <p className="text-sm text-muted-foreground mb-1">Style</p>
                      <Badge variant="secondary">{selectedEntry.style_preference}</Badge>
                    </div>
                  )}

                  {selectedEntry.tattoo_description && (
                    <div>
                      <p className="text-sm text-muted-foreground mb-1">Description</p>
                      <p className="text-sm text-foreground bg-muted/50 rounded p-2">
                        {selectedEntry.tattoo_description}
                      </p>
                    </div>
                  )}

                  {selectedEntry.max_budget && (
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Max Budget</span>
                      <span className="text-foreground">
                        ${selectedEntry.max_budget.toLocaleString()}
                      </span>
                    </div>
                  )}

                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Flexibility</span>
                    <span className="text-foreground">
                      ±{selectedEntry.flexibility_days || 3} days
                    </span>
                  </div>

                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Offers Sent</span>
                    <span className="text-foreground">{selectedEntry.offers_sent_count || 0}</span>
                  </div>

                  {selectedEntry.last_offer_sent_at && (
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Last Offer</span>
                      <span className="text-foreground">
                        {format(new Date(selectedEntry.last_offer_sent_at), "MMM d")}
                      </span>
                    </div>
                  )}
                </div>

                <div className="pt-3 border-t border-border space-y-2">
                  {selectedEntry.status === "waiting" && (
                    <>
                      <Button
                        onClick={() => sendOffer(selectedEntry)}
                        disabled={sendingOffer}
                        className="w-full"
                      >
                        {sendingOffer ? (
                          <Loader2 className="w-4 h-4 animate-spin mr-2" />
                        ) : (
                          <Gift className="w-4 h-4 mr-2" />
                        )}
                        Send Discount Offer
                      </Button>
                      <Button
                        variant="outline"
                        onClick={() => updateStatus(selectedEntry, "converted")}
                        className="w-full"
                      >
                        <CheckCircle className="w-4 h-4 mr-2" />
                        Mark as Converted
                      </Button>
                    </>
                  )}
                  {selectedEntry.status !== "expired" && (
                    <Button
                      variant="ghost"
                      onClick={() => updateStatus(selectedEntry, "expired")}
                      className="w-full text-muted-foreground"
                    >
                      <XCircle className="w-4 h-4 mr-2" />
                      Remove from Waitlist
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>
          ) : (
            <Card className="bg-card border-border">
              <CardContent className="p-8 text-center text-muted-foreground">
                <Clock className="w-12 h-12 mx-auto mb-4 opacity-50" />
                <p>Select an entry to view details</p>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
};

export default WaitlistManager;
