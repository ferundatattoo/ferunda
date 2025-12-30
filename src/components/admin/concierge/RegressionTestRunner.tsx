import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { 
  Play, CheckCircle, XCircle, Loader2, RefreshCw, 
  ChevronDown, ChevronUp, Clock, AlertTriangle
} from "lucide-react";
import { format } from "date-fns";

interface TestCase {
  id: string;
  name: string;
  description: string;
  category: string;
  is_active: boolean;
  last_run_at: string | null;
  last_passed: boolean | null;
  last_result: any;
  run_count: number;
  pass_count: number;
}

interface TestResult {
  testId: string;
  testName: string;
  passed: boolean;
  errors: string[];
  response?: string;
  toolsCalled?: string[];
  duration: number;
}

export function RegressionTestRunner() {
  const { toast } = useToast();
  const [tests, setTests] = useState<TestCase[]>([]);
  const [loading, setLoading] = useState(true);
  const [running, setRunning] = useState(false);
  const [runningTestId, setRunningTestId] = useState<string | null>(null);
  const [expandedTest, setExpandedTest] = useState<string | null>(null);
  const [lastRunResults, setLastRunResults] = useState<TestResult[] | null>(null);

  useEffect(() => {
    fetchTests();
  }, []);

  const fetchTests = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("concierge_test_cases")
      .select("*")
      .order("category")
      .order("name");

    if (error) {
      toast({ title: "Error loading tests", description: error.message, variant: "destructive" });
    } else {
      setTests((data || []) as TestCase[]);
    }
    setLoading(false);
  };

  const runAllTests = async () => {
    setRunning(true);
    setLastRunResults(null);

    try {
      const { data, error } = await supabase.functions.invoke("run-concierge-tests", {
        body: { runAll: true },
      });

      if (error) throw error;

      setLastRunResults(data.results);
      toast({
        title: `Tests Complete: ${data.summary.passRate}`,
        description: `${data.summary.passed} passed, ${data.summary.failed} failed`,
        variant: data.summary.failed > 0 ? "destructive" : "default",
      });

      await fetchTests();
    } catch (err) {
      toast({ title: "Error running tests", description: String(err), variant: "destructive" });
    }

    setRunning(false);
  };

  const runSingleTest = async (testId: string) => {
    setRunningTestId(testId);

    try {
      const { data, error } = await supabase.functions.invoke("run-concierge-tests", {
        body: { testIds: [testId] },
      });

      if (error) throw error;

      const result = data.results[0];
      toast({
        title: result.passed ? "Test Passed" : "Test Failed",
        description: result.passed ? `Completed in ${result.duration}ms` : result.errors[0],
        variant: result.passed ? "default" : "destructive",
      });

      await fetchTests();
    } catch (err) {
      toast({ title: "Error running test", description: String(err), variant: "destructive" });
    }

    setRunningTestId(null);
  };

  const categoryColors: Record<string, string> = {
    identity: "bg-blue-500/20 text-blue-400",
    guest_spots: "bg-green-500/20 text-green-400",
    tool_gating: "bg-purple-500/20 text-purple-400",
    pricing: "bg-yellow-500/20 text-yellow-400",
    blocking: "bg-red-500/20 text-red-400",
    conversation_flow: "bg-cyan-500/20 text-cyan-400",
    two_track: "bg-orange-500/20 text-orange-400",
    general: "bg-muted text-muted-foreground",
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  const passedCount = tests.filter(t => t.last_passed === true).length;
  const failedCount = tests.filter(t => t.last_passed === false).length;
  const untestedCount = tests.filter(t => t.last_passed === null).length;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-medium text-foreground">Regression Tests</h3>
          <p className="text-sm text-muted-foreground">
            Automated conversation tests to prevent concierge failures
          </p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={fetchTests}
            className="flex items-center gap-2 px-3 py-2 text-sm text-muted-foreground hover:text-foreground border border-border hover:border-foreground/20 transition-colors"
          >
            <RefreshCw className="w-4 h-4" />
            Refresh
          </button>
          <button
            onClick={runAllTests}
            disabled={running}
            className="flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground text-sm hover:bg-primary/90 disabled:opacity-50 transition-colors"
          >
            {running ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Play className="w-4 h-4" />
            )}
            Run All Tests
          </button>
        </div>
      </div>

      {/* Summary */}
      <div className="grid grid-cols-4 gap-4">
        <div className="p-4 bg-card border border-border">
          <div className="text-2xl font-bold text-foreground">{tests.length}</div>
          <div className="text-sm text-muted-foreground">Total Tests</div>
        </div>
        <div className="p-4 bg-card border border-green-500/30">
          <div className="text-2xl font-bold text-green-400">{passedCount}</div>
          <div className="text-sm text-muted-foreground">Passing</div>
        </div>
        <div className="p-4 bg-card border border-red-500/30">
          <div className="text-2xl font-bold text-red-400">{failedCount}</div>
          <div className="text-sm text-muted-foreground">Failing</div>
        </div>
        <div className="p-4 bg-card border border-border">
          <div className="text-2xl font-bold text-muted-foreground">{untestedCount}</div>
          <div className="text-sm text-muted-foreground">Untested</div>
        </div>
      </div>

      {/* Test List */}
      <div className="space-y-2">
        {tests.map((test) => (
          <div key={test.id} className="bg-card border border-border">
            <div className="flex items-center justify-between p-4">
              <div className="flex items-center gap-3 flex-1">
                {/* Status Icon */}
                {test.last_passed === null ? (
                  <div className="w-6 h-6 rounded-full bg-muted flex items-center justify-center">
                    <Clock className="w-4 h-4 text-muted-foreground" />
                  </div>
                ) : test.last_passed ? (
                  <div className="w-6 h-6 rounded-full bg-green-500/20 flex items-center justify-center">
                    <CheckCircle className="w-4 h-4 text-green-400" />
                  </div>
                ) : (
                  <div className="w-6 h-6 rounded-full bg-red-500/20 flex items-center justify-center">
                    <XCircle className="w-4 h-4 text-red-400" />
                  </div>
                )}

                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <span className="font-medium text-foreground">{test.name}</span>
                    <span className={`text-xs px-2 py-0.5 rounded ${categoryColors[test.category] || categoryColors.general}`}>
                      {test.category}
                    </span>
                  </div>
                  <div className="text-sm text-muted-foreground">{test.description}</div>
                </div>
              </div>

              <div className="flex items-center gap-2">
                {test.run_count > 0 && (
                  <span className="text-xs text-muted-foreground">
                    {test.pass_count}/{test.run_count} passed
                  </span>
                )}
                <button
                  onClick={() => runSingleTest(test.id)}
                  disabled={runningTestId === test.id}
                  className="p-2 text-muted-foreground hover:text-foreground transition-colors disabled:opacity-50"
                >
                  {runningTestId === test.id ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Play className="w-4 h-4" />
                  )}
                </button>
                <button
                  onClick={() => setExpandedTest(expandedTest === test.id ? null : test.id)}
                  className="p-2 text-muted-foreground hover:text-foreground transition-colors"
                >
                  {expandedTest === test.id ? (
                    <ChevronUp className="w-4 h-4" />
                  ) : (
                    <ChevronDown className="w-4 h-4" />
                  )}
                </button>
              </div>
            </div>

            {/* Expanded Details */}
            {expandedTest === test.id && (
              <div className="border-t border-border p-4 bg-background/50 space-y-3">
                {test.last_result && (
                  <>
                    <div className="text-sm">
                      <span className="text-muted-foreground">Last run: </span>
                      <span className="text-foreground">
                        {test.last_run_at ? format(new Date(test.last_run_at), "PPp") : "Never"}
                      </span>
                      {test.last_result.duration && (
                        <span className="text-muted-foreground ml-2">
                          ({test.last_result.duration}ms)
                        </span>
                      )}
                    </div>

                    {test.last_result.toolsCalled?.length > 0 && (
                      <div className="text-sm">
                        <span className="text-muted-foreground">Tools called: </span>
                        <span className="text-foreground">
                          {test.last_result.toolsCalled.join(", ")}
                        </span>
                      </div>
                    )}

                    {test.last_result.response && (
                      <div className="text-sm">
                        <div className="text-muted-foreground mb-1">Response preview:</div>
                        <div className="p-2 bg-muted/50 rounded text-xs font-mono text-foreground">
                          {test.last_result.response}
                        </div>
                      </div>
                    )}

                    {test.last_result.errors?.length > 0 && (
                      <div className="text-sm">
                        <div className="text-red-400 mb-1 flex items-center gap-1">
                          <AlertTriangle className="w-4 h-4" />
                          Errors:
                        </div>
                        <ul className="list-disc list-inside text-red-300 text-xs space-y-1">
                          {test.last_result.errors.map((err: string, i: number) => (
                            <li key={i}>{err}</li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </>
                )}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
