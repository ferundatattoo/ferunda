import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { Shield, Check, X, Clock, AlertTriangle, User } from "lucide-react";
import { format } from "date-fns";

interface PolicyOverride {
  id: string;
  booking_id: string | null;
  tattoo_brief_id: string | null;
  overridden_rule_id: string;
  original_decision: string;
  override_decision: string;
  reason: string;
  notes: string | null;
  requested_by: string | null;
  requested_at: string;
  approved_by: string | null;
  approved_at: string | null;
  expires_at: string | null;
  is_active: boolean;
  booking?: {
    name: string;
    email: string;
    tracking_code: string | null;
  };
}

export default function OverrideManager() {
  const { toast } = useToast();
  const [overrides, setOverrides] = useState<PolicyOverride[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'pending' | 'approved' | 'all'>('pending');

  useEffect(() => {
    fetchOverrides();
  }, [filter]);

  const fetchOverrides = async () => {
    setLoading(true);
    let query = supabase
      .from("policy_overrides")
      .select(`
        *,
        booking:bookings(name, email, tracking_code)
      `)
      .order("requested_at", { ascending: false });

    if (filter === 'pending') {
      query = query.is("approved_at", null).eq("is_active", true);
    } else if (filter === 'approved') {
      query = query.not("approved_at", "is", null);
    }

    const { data, error } = await query;

    if (error) {
      toast({ title: "Error loading overrides", description: error.message, variant: "destructive" });
    } else {
      setOverrides(data || []);
    }
    setLoading(false);
  };

  const approveOverride = async (override: PolicyOverride) => {
    const { data: { user } } = await supabase.auth.getUser();
    
    const { error } = await supabase
      .from("policy_overrides")
      .update({
        approved_by: user?.id,
        approved_at: new Date().toISOString(),
      })
      .eq("id", override.id);

    if (error) {
      toast({ title: "Error approving override", variant: "destructive" });
    } else {
      toast({ title: "Override approved" });
      fetchOverrides();
    }
  };

  const rejectOverride = async (override: PolicyOverride) => {
    const { error } = await supabase
      .from("policy_overrides")
      .update({ is_active: false })
      .eq("id", override.id);

    if (error) {
      toast({ title: "Error rejecting override", variant: "destructive" });
    } else {
      toast({ title: "Override rejected" });
      fetchOverrides();
    }
  };

  const getDecisionColor = (decision: string) => {
    switch (decision) {
      case 'ALLOW': return 'bg-green-500/10 text-green-500 border-green-500/30';
      case 'ALLOW_WITH_WARNING': return 'bg-amber-500/10 text-amber-500 border-amber-500/30';
      case 'REVIEW': return 'bg-blue-500/10 text-blue-500 border-blue-500/30';
      case 'BLOCK': return 'bg-red-500/10 text-red-500 border-red-500/30';
      default: return '';
    }
  };

  if (loading) {
    return <div className="flex items-center justify-center p-8">Loading overrides...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-foreground">Policy Overrides</h2>
          <p className="text-muted-foreground">Review and approve exceptions to policy rules</p>
        </div>
        <div className="flex gap-2">
          <Button
            variant={filter === 'pending' ? 'default' : 'outline'}
            onClick={() => setFilter('pending')}
          >
            <Clock className="w-4 h-4 mr-2" />
            Pending
          </Button>
          <Button
            variant={filter === 'approved' ? 'default' : 'outline'}
            onClick={() => setFilter('approved')}
          >
            <Check className="w-4 h-4 mr-2" />
            Approved
          </Button>
          <Button
            variant={filter === 'all' ? 'default' : 'outline'}
            onClick={() => setFilter('all')}
          >
            All
          </Button>
        </div>
      </div>

      {overrides.length === 0 ? (
        <Card className="p-8 text-center">
          <Shield className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
          <h3 className="text-lg font-medium mb-2">No Overrides</h3>
          <p className="text-muted-foreground">
            {filter === 'pending' ? 'No pending override requests' : 'No override history'}
          </p>
        </Card>
      ) : (
        <div className="space-y-4">
          {overrides.map((override) => (
            <Card key={override.id} className={!override.is_active ? 'opacity-60' : ''}>
              <CardContent className="p-4">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <Badge variant="outline" className={getDecisionColor(override.original_decision)}>
                        {override.original_decision}
                      </Badge>
                      <span className="text-muted-foreground">→</span>
                      <Badge variant="outline" className={getDecisionColor(override.override_decision)}>
                        {override.override_decision}
                      </Badge>
                      {override.approved_at ? (
                        <Badge variant="secondary" className="bg-green-500/10 text-green-500">
                          <Check className="w-3 h-3 mr-1" />
                          Approved
                        </Badge>
                      ) : override.is_active ? (
                        <Badge variant="secondary" className="bg-amber-500/10 text-amber-500">
                          <Clock className="w-3 h-3 mr-1" />
                          Pending
                        </Badge>
                      ) : (
                        <Badge variant="secondary" className="bg-red-500/10 text-red-500">
                          <X className="w-3 h-3 mr-1" />
                          Rejected
                        </Badge>
                      )}
                    </div>

                    <p className="text-sm font-mono text-muted-foreground mb-2">
                      Rule: {override.overridden_rule_id}
                    </p>

                    <div className="bg-muted/50 rounded-lg p-3 mb-3">
                      <p className="text-sm font-medium mb-1">Reason for Override:</p>
                      <p className="text-sm text-muted-foreground">{override.reason}</p>
                      {override.notes && (
                        <p className="text-sm text-muted-foreground mt-2 italic">{override.notes}</p>
                      )}
                    </div>

                    {override.booking && (
                      <div className="flex items-center gap-4 text-sm text-muted-foreground">
                        <span className="flex items-center gap-1">
                          <User className="w-4 h-4" />
                          {override.booking.name}
                        </span>
                        <span>{override.booking.email}</span>
                        {override.booking.tracking_code && (
                          <Badge variant="outline" className="font-mono text-xs">
                            {override.booking.tracking_code}
                          </Badge>
                        )}
                      </div>
                    )}

                    <div className="flex items-center gap-4 text-xs text-muted-foreground mt-3">
                      <span>Requested: {format(new Date(override.requested_at), 'MMM d, yyyy h:mm a')}</span>
                      {override.expires_at && (
                        <span className="flex items-center gap-1 text-amber-500">
                          <AlertTriangle className="w-3 h-3" />
                          Expires: {format(new Date(override.expires_at), 'MMM d, yyyy')}
                        </span>
                      )}
                    </div>
                  </div>

                  {!override.approved_at && override.is_active && (
                    <div className="flex gap-2 ml-4">
                      <Button
                        size="sm"
                        onClick={() => approveOverride(override)}
                        className="bg-green-600 hover:bg-green-700"
                      >
                        <Check className="w-4 h-4 mr-1" />
                        Approve
                      </Button>
                      <Button
                        size="sm"
                        variant="destructive"
                        onClick={() => rejectOverride(override)}
                      >
                        <X className="w-4 h-4 mr-1" />
                        Reject
                      </Button>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
