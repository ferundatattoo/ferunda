import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useOnDeviceML } from "@/hooks/useOnDeviceML";
import { useOfflineSync } from "@/hooks/useOfflineSync";
import { 
  Cpu, Download, Trash2, Play, CheckCircle, XCircle, 
  Wifi, WifiOff, RefreshCw, Database, HardDrive, Zap 
} from "lucide-react";
import { toast } from "@/hooks/use-toast";

const OnDeviceMLManager = () => {
  const { 
    isSupported, 
    loadModel, 
    unloadModel, 
    getAvailableModels,
    classifyStyle,
    estimateComplexity,
    analyzeSentiment,
  } = useOnDeviceML();
  
  const { status: offlineStatus, syncPendingActions, clearCache } = useOfflineSync();
  
  const [testResults, setTestResults] = useState<Record<string, unknown>>({});
  const [testing, setTesting] = useState<string | null>(null);

  const models = getAvailableModels();

  const handleLoadModel = async (modelId: string) => {
    const success = await loadModel(modelId as any);
    if (success) {
      toast({ title: `Model "${modelId}" loaded successfully` });
    }
  };

  const handleUnloadModel = (modelId: string) => {
    unloadModel(modelId);
    toast({ title: `Model "${modelId}" unloaded` });
  };

  const handleTestModel = async (modelId: string) => {
    setTesting(modelId);
    try {
      let result;
      switch (modelId) {
        case "style-classifier":
          result = await classifyStyle("test-image-data");
          break;
        case "complexity-estimator":
          result = await estimateComplexity("test-image-data");
          break;
        case "sentiment-analyzer":
          result = await analyzeSentiment("I'm so excited about my new tattoo!");
          break;
        default:
          result = { message: "Test completed" };
      }
      setTestResults(prev => ({ ...prev, [modelId]: result }));
      toast({ title: "Test completed successfully" });
    } catch (err) {
      toast({ title: "Test failed", variant: "destructive" });
    } finally {
      setTesting(null);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-foreground">On-Device ML & Offline</h2>
          <p className="text-muted-foreground">
            Manage local AI models and offline synchronization
          </p>
        </div>
        <div className="flex items-center gap-2">
          {offlineStatus.isOnline ? (
            <Badge className="bg-green-500/20 text-green-400">
              <Wifi className="w-3 h-3 mr-1" />
              Online
            </Badge>
          ) : (
            <Badge className="bg-amber-500/20 text-amber-400">
              <WifiOff className="w-3 h-3 mr-1" />
              Offline
            </Badge>
          )}
        </div>
      </div>

      {!isSupported && (
        <Card className="border-amber-500/50 bg-amber-500/10">
          <CardContent className="p-4">
            <p className="text-amber-400 text-sm">
              ⚠️ WebGL not supported. On-device ML may have reduced performance.
            </p>
          </CardContent>
        </Card>
      )}

      <Tabs defaultValue="models" className="w-full">
        <TabsList>
          <TabsTrigger value="models" className="flex items-center gap-2">
            <Cpu className="w-4 h-4" />
            ML Models
          </TabsTrigger>
          <TabsTrigger value="offline" className="flex items-center gap-2">
            <Database className="w-4 h-4" />
            Offline Sync
          </TabsTrigger>
        </TabsList>

        <TabsContent value="models" className="mt-4 space-y-4">
          <div className="grid gap-4">
            {models.map((model) => (
              <Card key={model.id}>
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <Cpu className="w-5 h-5 text-primary" />
                        <div>
                          <h3 className="font-medium">{model.name}</h3>
                          <p className="text-xs text-muted-foreground">
                            Size: {model.size} • Accuracy: {(model.accuracy * 100).toFixed(0)}%
                          </p>
                        </div>
                      </div>
                      
                      {model.status.isLoading && (
                        <div className="mt-2">
                          <Progress value={50} className="h-1" />
                          <p className="text-xs text-muted-foreground mt-1">Loading model...</p>
                        </div>
                      )}

                      {testResults[model.id] && (
                        <div className="mt-2 p-2 rounded bg-secondary/50">
                          <p className="text-xs font-mono text-muted-foreground">
                            {JSON.stringify(testResults[model.id], null, 2).slice(0, 150)}...
                          </p>
                        </div>
                      )}
                    </div>
                    
                    <div className="flex items-center gap-2">
                      {model.status.isLoaded ? (
                        <>
                          <Badge className="bg-green-500/20 text-green-400">
                            <CheckCircle className="w-3 h-3 mr-1" />
                            Loaded
                          </Badge>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => handleTestModel(model.id)}
                            disabled={testing === model.id}
                          >
                            {testing === model.id ? (
                              <RefreshCw className="w-4 h-4 animate-spin" />
                            ) : (
                              <Play className="w-4 h-4" />
                            )}
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => handleUnloadModel(model.id)}
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </>
                      ) : (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleLoadModel(model.id)}
                          disabled={model.status.isLoading}
                        >
                          {model.status.isLoading ? (
                            <RefreshCw className="w-4 h-4 animate-spin mr-2" />
                          ) : (
                            <Download className="w-4 h-4 mr-2" />
                          )}
                          Load
                        </Button>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="offline" className="mt-4 space-y-4">
          <div className="grid md:grid-cols-3 gap-4">
            <Card>
              <CardContent className="p-4 text-center">
                <HardDrive className="w-8 h-8 mx-auto mb-2 text-primary" />
                <p className="text-2xl font-bold">{offlineStatus.pendingActions}</p>
                <p className="text-xs text-muted-foreground">Pending Actions</p>
              </CardContent>
            </Card>
            
            <Card>
              <CardContent className="p-4 text-center">
                <Zap className="w-8 h-8 mx-auto mb-2 text-amber-400" />
                <p className="text-2xl font-bold">
                  {offlineStatus.isSyncing ? "Syncing..." : "Ready"}
                </p>
                <p className="text-xs text-muted-foreground">Sync Status</p>
              </CardContent>
            </Card>
            
            <Card>
              <CardContent className="p-4 text-center">
                <Database className="w-8 h-8 mx-auto mb-2 text-green-400" />
                <p className="text-2xl font-bold">
                  {offlineStatus.lastSyncAt 
                    ? offlineStatus.lastSyncAt.toLocaleTimeString()
                    : "Never"}
                </p>
                <p className="text-xs text-muted-foreground">Last Sync</p>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Sync Controls</CardTitle>
              <CardDescription>
                Manage offline data synchronization
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex gap-4">
                <Button 
                  onClick={syncPendingActions}
                  disabled={offlineStatus.isSyncing || !offlineStatus.isOnline}
                >
                  <RefreshCw className={`w-4 h-4 mr-2 ${offlineStatus.isSyncing ? 'animate-spin' : ''}`} />
                  Sync Now
                </Button>
                
                <Button variant="outline" onClick={clearCache}>
                  <Trash2 className="w-4 h-4 mr-2" />
                  Clear Cache
                </Button>
              </div>

              <div className="p-4 rounded-lg bg-secondary/30">
                <h4 className="font-medium mb-2">Offline Capabilities</h4>
                <ul className="text-sm text-muted-foreground space-y-1">
                  <li>✓ Queue booking requests offline</li>
                  <li>✓ Cache client data for instant access</li>
                  <li>✓ Run style classification locally</li>
                  <li>✓ Auto-sync when connection restored</li>
                </ul>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default OnDeviceMLManager;
