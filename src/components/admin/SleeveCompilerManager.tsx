import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import { 
  Layers, 
  CheckCircle, 
  AlertCircle, 
  RefreshCw, 
  Download, 
  Eye,
  Wand2,
  Link,
  Unlink,
  RotateCcw
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface SleeveSegment {
  id: string;
  name: string;
  bodyPart: string;
  coverage: number;
  designUrl?: string;
  style?: string;
  locked: boolean;
}

interface SleeveProject {
  id: string;
  sleeveType: string;
  segments: SleeveSegment[];
  progress: number;
  status: string;
}

const SleeveCompilerManager = () => {
  const [projects, setProjects] = useState<SleeveProject[]>([]);
  const [activeProject, setActiveProject] = useState<SleeveProject | null>(null);
  const [loading, setLoading] = useState(false);
  const [flowCheck, setFlowCheck] = useState<{
    score: number;
    issues: Array<{ from: string; to: string; issue: string }>;
    suggestions: string[];
  } | null>(null);

  const createProject = async (sleeveType: string) => {
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('sleeve-compiler', {
        body: {
          action: 'init_project',
          sessionId: crypto.randomUUID(),
          sleeveType,
        },
      });

      if (error) throw error;

      const project: SleeveProject = {
        id: data.project.id,
        sleeveType: data.project.sleeveType,
        segments: data.project.segments,
        progress: 0,
        status: 'draft',
      };

      setProjects(prev => [...prev, project]);
      setActiveProject(project);
      toast.success('Sleeve project created');
    } catch (err) {
      console.error('Error creating project:', err);
      toast.error('Failed to create project');
    } finally {
      setLoading(false);
    }
  };

  const checkFlowContinuity = async () => {
    if (!activeProject) return;
    
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('sleeve-compiler', {
        body: {
          action: 'check_flow_continuity',
          projectId: activeProject.id,
        },
      });

      if (error) throw error;
      setFlowCheck(data);
      
      if (data.isCoherent) {
        toast.success('Flow check passed!');
      } else {
        toast.warning(`${data.issues.length} flow issues found`);
      }
    } catch (err) {
      console.error('Error checking flow:', err);
      toast.error('Failed to check flow');
    } finally {
      setLoading(false);
    }
  };

  const generateFiller = async (segmentId: string) => {
    if (!activeProject) return;

    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('sleeve-compiler', {
        body: {
          action: 'generate_filler',
          projectId: activeProject.id,
          segmentId,
          adjacentStyles: ['geometric', 'organic'],
          prompt: 'Create transitional filler design',
        },
      });

      if (error) throw error;
      toast.success('Filler design generated');
    } catch (err) {
      console.error('Error generating filler:', err);
      toast.error('Failed to generate filler');
    } finally {
      setLoading(false);
    }
  };

  const renderUnified = async (viewAngle: string) => {
    if (!activeProject) return;

    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('sleeve-compiler', {
        body: {
          action: 'render_unified',
          projectId: activeProject.id,
          viewAngle,
        },
      });

      if (error) throw error;
      toast.success('Unified render complete');
    } catch (err) {
      console.error('Error rendering:', err);
      toast.error('Failed to render');
    } finally {
      setLoading(false);
    }
  };

  const exportStencils = async () => {
    if (!activeProject) return;

    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('sleeve-compiler', {
        body: {
          action: 'export_stencils',
          projectId: activeProject.id,
          format: 'pdf',
        },
      });

      if (error) throw error;
      toast.success(`${data.stencils.length} stencils exported`);
    } catch (err) {
      console.error('Error exporting:', err);
      toast.error('Failed to export stencils');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold flex items-center gap-2">
            <Layers className="h-5 w-5 text-primary" />
            Sleeve Design Compiler
          </h2>
          <p className="text-sm text-muted-foreground">
            Design cohesive full-arm pieces with segment management
          </p>
        </div>
        <Select onValueChange={createProject} disabled={loading}>
          <SelectTrigger className="w-48">
            <SelectValue placeholder="New Sleeve Project" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="full">Full Sleeve</SelectItem>
            <SelectItem value="half">Half Sleeve</SelectItem>
            <SelectItem value="quarter">Quarter Sleeve</SelectItem>
            <SelectItem value="custom">Custom</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Segment Canvas */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="text-base">Segment Canvas</CardTitle>
            <CardDescription>
              {activeProject 
                ? `${activeProject.sleeveType} sleeve - ${activeProject.segments.length} segments`
                : 'Create a project to start designing'}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {activeProject ? (
              <div className="space-y-4">
                <div className="flex items-center gap-4 mb-4">
                  <Progress value={activeProject.progress} className="flex-1" />
                  <span className="text-sm font-medium">{activeProject.progress}%</span>
                </div>

                <ScrollArea className="h-[400px]">
                  <div className="space-y-3">
                    {activeProject.segments.map((segment, idx) => (
                      <div
                        key={segment.id}
                        className="flex items-center gap-4 p-4 rounded-lg border bg-card hover:bg-accent/50 transition-colors"
                      >
                        <div className="flex items-center gap-2">
                          {segment.locked ? (
                            <Link className="h-4 w-4 text-primary" />
                          ) : (
                            <Unlink className="h-4 w-4 text-muted-foreground" />
                          )}
                          <span className="font-medium">{segment.name}</span>
                        </div>

                        <div className="flex-1">
                          {segment.designUrl ? (
                            <Badge variant="outline" className="bg-green-500/10 text-green-500">
                              <CheckCircle className="h-3 w-3 mr-1" />
                              Design Set
                            </Badge>
                          ) : (
                            <Badge variant="outline" className="bg-orange-500/10 text-orange-500">
                              Empty
                            </Badge>
                          )}
                          {segment.style && (
                            <Badge variant="secondary" className="ml-2">
                              {segment.style}
                            </Badge>
                          )}
                        </div>

                        <div className="flex items-center gap-2">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => generateFiller(segment.id)}
                            disabled={loading}
                          >
                            <Wand2 className="h-4 w-4" />
                          </Button>
                          <Button variant="ghost" size="sm">
                            <Eye className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                </ScrollArea>
              </div>
            ) : (
              <div className="h-[400px] flex items-center justify-center text-muted-foreground">
                <div className="text-center">
                  <Layers className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>Select a sleeve type to begin</p>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Tools Panel */}
        <div className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Flow Analysis</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <Button
                className="w-full"
                onClick={checkFlowContinuity}
                disabled={!activeProject || loading}
              >
                {loading ? (
                  <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                ) : (
                  <RotateCcw className="h-4 w-4 mr-2" />
                )}
                Check Flow Continuity
              </Button>

              {flowCheck && (
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-sm">Flow Score</span>
                    <Badge variant={flowCheck.score >= 0.8 ? "default" : "destructive"}>
                      {Math.round(flowCheck.score * 100)}%
                    </Badge>
                  </div>

                  {flowCheck.issues.length > 0 && (
                    <div className="space-y-2">
                      <span className="text-sm font-medium text-destructive">Issues:</span>
                      {flowCheck.issues.map((issue, idx) => (
                        <div key={idx} className="text-xs p-2 bg-destructive/10 rounded">
                          <AlertCircle className="h-3 w-3 inline mr-1" />
                          {issue.issue}
                        </div>
                      ))}
                    </div>
                  )}

                  {flowCheck.suggestions.length > 0 && (
                    <div className="space-y-2">
                      <span className="text-sm font-medium">Suggestions:</span>
                      {flowCheck.suggestions.map((suggestion, idx) => (
                        <p key={idx} className="text-xs text-muted-foreground">
                          • {suggestion}
                        </p>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Render & Export</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <Select 
                onValueChange={renderUnified} 
                disabled={!activeProject || loading}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Render View" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="front">Front View</SelectItem>
                  <SelectItem value="back">Back View</SelectItem>
                  <SelectItem value="inner">Inner View</SelectItem>
                  <SelectItem value="outer">Outer View</SelectItem>
                  <SelectItem value="360-spin">360° Spin</SelectItem>
                </SelectContent>
              </Select>

              <Button
                variant="outline"
                className="w-full"
                onClick={exportStencils}
                disabled={!activeProject || loading}
              >
                <Download className="h-4 w-4 mr-2" />
                Export Stencils
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default SleeveCompilerManager;
