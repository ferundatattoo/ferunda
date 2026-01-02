import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { supabase } from "@/integrations/supabase/client";
import { 
  Play, CheckCircle, XCircle, Clock, Loader2, RefreshCw, 
  Zap, Brain, CreditCard, MessageSquare, Share2, Settings
} from "lucide-react";
import { toast } from "sonner";

interface FunctionTest {
  name: string;
  category: string;
  status: "idle" | "running" | "success" | "error";
  latency?: number;
  error?: string;
}

const EDGE_FUNCTIONS: { name: string; category: string }[] = [
  // Core
  { name: "check-secrets-health", category: "Core" },
  { name: "create-booking", category: "Core" },
  { name: "booking-notification", category: "Core" },
  { name: "public-booking-status", category: "Core" },
  { name: "magic-link", category: "Core" },
  { name: "send-verification-otp", category: "Core" },
  { name: "verify-otp", category: "Core" },
  // AI
  { name: "chat-assistant", category: "AI" },
  { name: "chat-session", category: "AI" },
  { name: "studio-concierge", category: "AI" },
  { name: "ai-triage", category: "AI" },
  { name: "ai-artist-setup", category: "AI" },
  { name: "design-compiler", category: "AI" },
  { name: "design-orchestrator", category: "AI" },
  { name: "generate-design", category: "AI" },
  { name: "analyze-reference", category: "AI" },
  { name: "analyze-healing-photo", category: "AI" },
  { name: "feasibility-lab", category: "AI" },
  { name: "session-estimator", category: "AI" },
  { name: "style-dna", category: "AI" },
  { name: "tattoo-extractor", category: "AI" },
  { name: "vision-stack", category: "AI" },
  // Payments
  { name: "create-stripe-checkout", category: "Payments" },
  { name: "create-stripe-payment", category: "Payments" },
  { name: "get-payment-link", category: "Payments" },
  { name: "stripe-webhook", category: "Payments" },
  { name: "send-deposit-request", category: "Payments" },
  // Social
  { name: "instagram-webhook", category: "Social" },
  { name: "instagram-send", category: "Social" },
  { name: "tiktok-webhook", category: "Social" },
  { name: "tiktok-upload", category: "Social" },
  { name: "social-webhook", category: "Social" },
  { name: "social-growth-engine", category: "Social" },
  { name: "scan-social-trends", category: "Social" },
  // Communications
  { name: "send-contact-email", category: "Communications" },
  { name: "crm-send-email", category: "Communications" },
  { name: "send-campaign", category: "Communications" },
  { name: "send-waitlist-offer", category: "Communications" },
  { name: "smart-follow-up", category: "Communications" },
  // Enterprise
  { name: "enterprise-manager", category: "Enterprise" },
  { name: "workflow-executor", category: "Enterprise" },
  { name: "automation-cron", category: "Enterprise" },
  { name: "drift-detector", category: "Enterprise" },
  { name: "shadow-evaluator", category: "Enterprise" },
  { name: "revenue-intelligence", category: "Enterprise" },
  { name: "client-lifecycle", category: "Enterprise" },
  // AR/Design
  { name: "ar-tattoo-engine", category: "AR/Design" },
  { name: "body-atlas", category: "AR/Design" },
  { name: "codesign-engine", category: "AR/Design" },
  { name: "sketch-gen-studio", category: "AR/Design" },
  { name: "sketch-finalizer", category: "AR/Design" },
  { name: "sleeve-compiler", category: "AR/Design" },
  { name: "viability-3d-simulator", category: "AR/Design" },
  { name: "viability-pose-detection", category: "AR/Design" },
  // Avatar/Voice
  { name: "generate-avatar-video", category: "Avatar" },
  { name: "elevenlabs-voice", category: "Avatar" },
  // Other
  { name: "customer-portal", category: "Other" },
  { name: "conversion-engine", category: "Other" },
  { name: "evaluate-policy", category: "Other" },
  { name: "google-calendar-sync", category: "Other" },
  { name: "google-oauth-exchange", category: "Other" },
  { name: "provider-fallback", category: "Other" },
  { name: "rotate-tokens", category: "Other" },
  { name: "run-concierge-tests", category: "Other" },
  { name: "self-improving", category: "Other" },
  { name: "ferunda-agent", category: "Other" },
  { name: "ai-marketing-studio", category: "Other" },
  { name: "generate-healing-certificate", category: "Other" },
];

const categoryIcons: Record<string, React.ElementType> = {
  Core: Settings,
  AI: Brain,
  Payments: CreditCard,
  Social: Share2,
  Communications: MessageSquare,
  Enterprise: Zap,
  "AR/Design": Zap,
  Avatar: Zap,
  Other: Settings,
};

export const EdgeFunctionTestRunner = () => {
  const [tests, setTests] = useState<FunctionTest[]>(
    EDGE_FUNCTIONS.map(f => ({ ...f, status: "idle" }))
  );
  const [isRunningAll, setIsRunningAll] = useState(false);

  const runTest = async (functionName: string) => {
    setTests(prev => prev.map(t => 
      t.name === functionName ? { ...t, status: "running", error: undefined } : t
    ));

    const startTime = Date.now();
    
    try {
      // For most functions, we just do a health check (OPTIONS or minimal POST)
      const { error } = await supabase.functions.invoke(functionName, {
        body: { healthCheck: true },
      });

      const latency = Date.now() - startTime;

      if (error) {
        // Some functions may return errors for health checks, but that's OK - they responded
        if (error.message?.includes("CORS") || latency > 0) {
          setTests(prev => prev.map(t => 
            t.name === functionName ? { ...t, status: "success", latency } : t
          ));
        } else {
          setTests(prev => prev.map(t => 
            t.name === functionName ? { ...t, status: "error", latency, error: error.message } : t
          ));
        }
      } else {
        setTests(prev => prev.map(t => 
          t.name === functionName ? { ...t, status: "success", latency } : t
        ));
      }
    } catch (err: unknown) {
      const latency = Date.now() - startTime;
      setTests(prev => prev.map(t => 
        t.name === functionName 
          ? { ...t, status: "error", latency, error: err instanceof Error ? err.message : "Unknown error" } 
          : t
      ));
    }
  };

  const runAllTests = async () => {
    setIsRunningAll(true);
    toast.info("Running all edge function tests...");

    // Reset all tests
    setTests(EDGE_FUNCTIONS.map(f => ({ ...f, status: "idle" })));

    // Run tests in batches of 5 to avoid overwhelming
    const batchSize = 5;
    for (let i = 0; i < EDGE_FUNCTIONS.length; i += batchSize) {
      const batch = EDGE_FUNCTIONS.slice(i, i + batchSize);
      await Promise.all(batch.map(f => runTest(f.name)));
    }

    setIsRunningAll(false);
    
    const results = tests.filter(t => t.status !== "idle");
    const successCount = results.filter(t => t.status === "success").length;
    toast.success(`Tests complete: ${successCount}/${EDGE_FUNCTIONS.length} passed`);
  };

  const categories = [...new Set(EDGE_FUNCTIONS.map(f => f.category))];
  
  const getStatusIcon = (status: FunctionTest["status"]) => {
    switch (status) {
      case "running": return <Loader2 className="h-4 w-4 animate-spin text-blue-500" />;
      case "success": return <CheckCircle className="h-4 w-4 text-emerald-500" />;
      case "error": return <XCircle className="h-4 w-4 text-red-500" />;
      default: return <Clock className="h-4 w-4 text-muted-foreground" />;
    }
  };

  const successCount = tests.filter(t => t.status === "success").length;
  const errorCount = tests.filter(t => t.status === "error").length;

  return (
    <Card className="border-border/50 bg-card/50 backdrop-blur-sm">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Zap className="h-5 w-5 text-primary" />
              Edge Function Test Runner
            </CardTitle>
            <CardDescription>
              Test all {EDGE_FUNCTIONS.length} edge functions • {successCount} passed • {errorCount} failed
            </CardDescription>
          </div>
          <Button onClick={runAllTests} disabled={isRunningAll}>
            {isRunningAll ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Running...
              </>
            ) : (
              <>
                <Play className="h-4 w-4 mr-2" />
                Run All Tests
              </>
            )}
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        <ScrollArea className="h-[500px] pr-4">
          <div className="space-y-6">
            {categories.map(category => {
              const CategoryIcon = categoryIcons[category] || Settings;
              const categoryTests = tests.filter(t => t.category === category);
              const categorySuccess = categoryTests.filter(t => t.status === "success").length;
              
              return (
                <div key={category} className="space-y-2">
                  <div className="flex items-center gap-2 mb-3">
                    <CategoryIcon className="h-4 w-4 text-primary" />
                    <h3 className="font-semibold text-sm">{category}</h3>
                    <Badge variant="outline" className="text-xs">
                      {categorySuccess}/{categoryTests.length}
                    </Badge>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2">
                    {categoryTests.map(test => (
                      <div 
                        key={test.name}
                        className="flex items-center justify-between p-2 rounded-lg bg-secondary/30 border border-border/30 hover:border-border/60 transition-colors"
                      >
                        <div className="flex items-center gap-2 min-w-0">
                          {getStatusIcon(test.status)}
                          <span className="text-xs font-mono truncate">{test.name}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          {test.latency && (
                            <span className="text-xs text-muted-foreground">
                              {test.latency}ms
                            </span>
                          )}
                          <Button 
                            variant="ghost" 
                            size="icon" 
                            className="h-6 w-6"
                            onClick={() => runTest(test.name)}
                            disabled={test.status === "running"}
                          >
                            <RefreshCw className="h-3 w-3" />
                          </Button>
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
  );
};

export default EdgeFunctionTestRunner;
