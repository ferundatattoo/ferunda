import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { ScrollArea } from "@/components/ui/scroll-area";
import { 
  Key, 
  CheckCircle, 
  XCircle, 
  RefreshCw,
  Shield,
  Sparkles,
  Share2,
  CreditCard,
  Video,
  Settings
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface SecretHealth {
  name: string;
  configured: boolean;
  service: string;
  category: 'core' | 'ai' | 'social' | 'payments' | 'video';
  description?: string;
}

interface CategoryStats {
  category: string;
  configured: number;
  total: number;
  percentage: number;
}

const SecretsHealthPanel = () => {
  const [loading, setLoading] = useState(false);
  const [secrets, setSecrets] = useState<SecretHealth[]>([]);
  const [categoryStats, setCategoryStats] = useState<CategoryStats[]>([]);
  const [summary, setSummary] = useState<{ configured: number; total: number; percentage: number } | null>(null);

  const loadSecretsHealth = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('check-secrets-health');

      if (error) throw error;

      setSecrets(data.secrets || []);
      setCategoryStats(data.categoryStats || []);
      setSummary(data.summary || null);
      toast.success('Secrets health check complete');
    } catch (err) {
      console.error('Error checking secrets:', err);
      toast.error('Failed to check secrets health');
      // Fallback mock data
      setSecrets([
        { name: 'LOVABLE_AI', configured: true, service: 'Lovable AI (Built-in)', category: 'ai' },
        { name: 'RESEND_API_KEY', configured: false, service: 'Email (Resend)', category: 'core' },
      ]);
      setSummary({ configured: 1, total: 2, percentage: 50 });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadSecretsHealth();
  }, []);

  const getCategoryIcon = (category: string) => {
    switch (category) {
      case 'core': return <Settings className="h-4 w-4" />;
      case 'ai': return <Sparkles className="h-4 w-4" />;
      case 'social': return <Share2 className="h-4 w-4" />;
      case 'payments': return <CreditCard className="h-4 w-4" />;
      case 'video': return <Video className="h-4 w-4" />;
      default: return <Key className="h-4 w-4" />;
    }
  };

  const getCategoryColor = (category: string) => {
    switch (category) {
      case 'core': return 'bg-blue-500/10 text-blue-500 border-blue-500/20';
      case 'ai': return 'bg-purple-500/10 text-purple-500 border-purple-500/20';
      case 'social': return 'bg-pink-500/10 text-pink-500 border-pink-500/20';
      case 'payments': return 'bg-green-500/10 text-green-500 border-green-500/20';
      case 'video': return 'bg-orange-500/10 text-orange-500 border-orange-500/20';
      default: return 'bg-muted text-muted-foreground';
    }
  };

  const groupedSecrets = secrets.reduce((acc, secret) => {
    if (!acc[secret.category]) {
      acc[secret.category] = [];
    }
    acc[secret.category].push(secret);
    return acc;
  }, {} as Record<string, SecretHealth[]>);

  const categoryOrder = ['ai', 'core', 'social', 'payments', 'video'];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold flex items-center gap-2">
            <Shield className="h-5 w-5 text-primary" />
            API Keys & Secrets
          </h2>
          <p className="text-sm text-muted-foreground">
            Configuration status for all integrations
          </p>
        </div>
        <Button 
          variant="outline" 
          onClick={loadSecretsHealth}
          disabled={loading}
        >
          {loading ? (
            <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
          ) : (
            <RefreshCw className="h-4 w-4 mr-2" />
          )}
          Refresh
        </Button>
      </div>

      {/* Overall Summary */}
      {summary && (
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between mb-4">
              <div>
                <p className="text-3xl font-bold">{summary.configured}/{summary.total}</p>
                <p className="text-sm text-muted-foreground">Secrets Configured</p>
              </div>
              <div className="text-right">
                <p className="text-3xl font-bold text-primary">{summary.percentage}%</p>
                <p className="text-sm text-muted-foreground">Complete</p>
              </div>
            </div>
            <Progress value={summary.percentage} className="h-3" />
          </CardContent>
        </Card>
      )}

      {/* Category Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        {categoryStats.map((stat) => (
          <Card key={stat.category} className={stat.percentage === 100 ? 'border-green-500/50' : ''}>
            <CardContent className="pt-4 pb-3">
              <div className="flex items-center gap-2 mb-2">
                {getCategoryIcon(stat.category)}
                <span className="text-sm font-medium capitalize">{stat.category}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-lg font-bold">{stat.configured}/{stat.total}</span>
                {stat.percentage === 100 ? (
                  <CheckCircle className="h-4 w-4 text-green-500" />
                ) : (
                  <span className="text-xs text-muted-foreground">{stat.percentage}%</span>
                )}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Detailed Secrets List */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">All Secrets</CardTitle>
          <CardDescription>
            Status of each configured secret and API key
          </CardDescription>
        </CardHeader>
        <CardContent>
          <ScrollArea className="h-[400px]">
            <div className="space-y-6">
              {categoryOrder.map((category) => {
                const categorySecrets = groupedSecrets[category];
                if (!categorySecrets || categorySecrets.length === 0) return null;

                return (
                  <div key={category}>
                    <div className="flex items-center gap-2 mb-3">
                      {getCategoryIcon(category)}
                      <h3 className="font-medium capitalize">{category}</h3>
                    </div>
                    <div className="space-y-2">
                      {categorySecrets.map((secret) => (
                        <div 
                          key={secret.name}
                          className="flex items-center justify-between p-3 rounded-lg border bg-card hover:bg-accent/50 transition-colors"
                        >
                          <div className="flex items-center gap-3">
                            {secret.configured ? (
                              <CheckCircle className="h-5 w-5 text-green-500 shrink-0" />
                            ) : (
                              <XCircle className="h-5 w-5 text-red-500 shrink-0" />
                            )}
                            <div>
                              <p className="font-medium text-sm">{secret.service}</p>
                              {secret.description && (
                                <p className="text-xs text-muted-foreground">{secret.description}</p>
                              )}
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            <Badge 
                              variant={secret.configured ? "default" : "secondary"}
                              className={secret.configured ? "bg-green-500/10 text-green-500 border-green-500/20" : ""}
                            >
                              {secret.configured ? 'Configured' : 'Not Set'}
                            </Badge>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          </ScrollArea>
        </CardContent>
      </Card>
    </div>
  );
};

export default SecretsHealthPanel;
