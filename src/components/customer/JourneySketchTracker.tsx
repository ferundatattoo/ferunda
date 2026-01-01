import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { supabase } from '@/integrations/supabase/client';
import { 
  Sparkles, 
  Check, 
  RefreshCw, 
  Camera, 
  Download,
  Clock,
  ThumbsUp,
  MessageSquare
} from 'lucide-react';

interface SketchData {
  id: string;
  sketch_url: string;
  reference_url?: string;
  prompt_used?: string;
  similarity_score?: number;
  approved?: boolean;
  approved_by?: string;
  feedback?: string;
  iteration_number: number;
  body_part?: string;
  ar_screenshot_url?: string;
  created_at: string;
}

interface JourneySketchTrackerProps {
  bookingId?: string;
  conversationId?: string;
  onARPreview?: (sketchUrl: string) => void;
}

export const JourneySketchTracker: React.FC<JourneySketchTrackerProps> = ({
  bookingId,
  conversationId,
  onARPreview
}) => {
  const [sketches, setSketches] = useState<SketchData[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [currentSketch, setCurrentSketch] = useState<SketchData | null>(null);

  useEffect(() => {
    fetchSketches();
  }, [bookingId, conversationId]);

  const fetchSketches = async () => {
    setIsLoading(true);
    try {
      let query = supabase
        .from('sketch_approvals')
        .select('*')
        .order('created_at', { ascending: false });

      if (bookingId) {
        query = query.eq('booking_id', bookingId);
      } else if (conversationId) {
        query = query.eq('conversation_id', conversationId);
      } else {
        setIsLoading(false);
        return;
      }

      const { data, error } = await query;

      if (!error && data) {
        setSketches(data);
        // Set the most recent approved or latest sketch as current
        const approved = data.find(s => s.approved === true);
        setCurrentSketch(approved || data[0] || null);
      }
    } catch (error) {
      console.error('Error fetching sketches:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const getStatusBadge = (sketch: SketchData) => {
    if (sketch.approved === true) {
      return <Badge className="bg-green-500">Approved</Badge>;
    } else if (sketch.approved === false) {
      return <Badge variant="destructive">Rejected</Badge>;
    } else {
      return <Badge variant="secondary">Pending Review</Badge>;
    }
  };

  const getJourneyProgress = () => {
    if (!currentSketch) return 0;
    if (currentSketch.approved === true) return 100;
    if (sketches.length > 0) {
      // Progress based on iterations and approval status
      const latestIteration = Math.max(...sketches.map(s => s.iteration_number || 1));
      if (latestIteration >= 3) return 80;
      if (latestIteration >= 2) return 60;
      return 40;
    }
    return 20;
  };

  if (isLoading) {
    return (
      <Card className="animate-pulse">
        <CardContent className="p-6">
          <div className="h-32 bg-muted rounded" />
        </CardContent>
      </Card>
    );
  }

  if (!currentSketch && sketches.length === 0) {
    return (
      <Card className="border-dashed">
        <CardContent className="p-6 text-center">
          <Sparkles className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
          <h3 className="font-medium mb-2">No Sketches Yet</h3>
          <p className="text-sm text-muted-foreground">
            Your custom design sketches will appear here once generated
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {/* Current Sketch Hero */}
      {currentSketch && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <Card className="border-primary/20 overflow-hidden">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="flex items-center gap-2">
                  <Sparkles className="h-5 w-5 text-primary" />
                  Your Design
                </CardTitle>
                {getStatusBadge(currentSketch)}
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Sketch Image */}
              <div className="relative group">
                <img
                  src={currentSketch.sketch_url}
                  alt="Your tattoo design"
                  className="w-full h-64 object-contain bg-muted rounded-lg"
                />
                
                {/* Overlay Actions */}
                <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity rounded-lg flex items-center justify-center gap-3">
                  {onARPreview && (
                    <Button 
                      size="sm" 
                      onClick={() => onARPreview(currentSketch.sketch_url)}
                      className="bg-primary hover:bg-primary/90"
                    >
                      <Camera className="h-4 w-4 mr-1" /> Try AR Preview
                    </Button>
                  )}
                  <Button size="sm" variant="secondary" asChild>
                    <a href={currentSketch.sketch_url} download="my-tattoo-design.png">
                      <Download className="h-4 w-4 mr-1" /> Download
                    </a>
                  </Button>
                </div>
              </div>

              {/* Similarity Score */}
              {currentSketch.similarity_score && (
                <div className="space-y-1">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">Style Match</span>
                    <span className="font-medium">{(currentSketch.similarity_score * 100).toFixed(0)}%</span>
                  </div>
                  <Progress value={currentSketch.similarity_score * 100} />
                </div>
              )}

              {/* Body Part & Iteration */}
              <div className="flex items-center gap-4 text-sm text-muted-foreground">
                {currentSketch.body_part && (
                  <span>Placement: {currentSketch.body_part}</span>
                )}
                <span>Iteration #{currentSketch.iteration_number}</span>
              </div>

              {/* Prompt Used */}
              {currentSketch.prompt_used && (
                <div className="bg-muted p-3 rounded-lg">
                  <p className="text-sm italic">"{currentSketch.prompt_used}"</p>
                </div>
              )}

              {/* AR Screenshot if captured */}
              {currentSketch.ar_screenshot_url && (
                <div className="space-y-2">
                  <h4 className="text-sm font-medium flex items-center gap-2">
                    <Camera className="h-4 w-4" /> AR Preview Captured
                  </h4>
                  <img
                    src={currentSketch.ar_screenshot_url}
                    alt="AR preview"
                    className="w-full h-40 object-cover rounded-lg"
                  />
                </div>
              )}
            </CardContent>
          </Card>
        </motion.div>
      )}

      {/* Journey Progress */}
      <Card>
        <CardContent className="p-4">
          <div className="space-y-2">
            <div className="flex items-center justify-between text-sm">
              <span className="font-medium">Design Journey</span>
              <span className="text-muted-foreground">{getJourneyProgress()}% Complete</span>
            </div>
            <Progress value={getJourneyProgress()} className="h-2" />
            <div className="flex items-center justify-between text-xs text-muted-foreground pt-1">
              <span>Concept</span>
              <span>Refinement</span>
              <span>Approved</span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Sketch History */}
      {sketches.length > 1 && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm flex items-center gap-2">
              <Clock className="h-4 w-4" />
              Design History
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {sketches.slice(0, 5).map((sketch, index) => (
              <motion.div
                key={sketch.id}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: index * 0.1 }}
                className={`flex items-center gap-3 p-2 rounded-lg cursor-pointer transition-colors ${
                  currentSketch?.id === sketch.id 
                    ? 'bg-primary/10 border border-primary/20' 
                    : 'hover:bg-muted'
                }`}
                onClick={() => setCurrentSketch(sketch)}
              >
                <img
                  src={sketch.sketch_url}
                  alt={`Iteration ${sketch.iteration_number}`}
                  className="w-12 h-12 object-cover rounded"
                />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium">
                      Iteration #{sketch.iteration_number}
                    </span>
                    {sketch.approved === true && (
                      <ThumbsUp className="h-3 w-3 text-green-500" />
                    )}
                  </div>
                  {sketch.feedback && (
                    <p className="text-xs text-muted-foreground truncate">
                      <MessageSquare className="h-3 w-3 inline mr-1" />
                      {sketch.feedback}
                    </p>
                  )}
                </div>
                {getStatusBadge(sketch)}
              </motion.div>
            ))}
          </CardContent>
        </Card>
      )}

      {/* Refresh Button */}
      <Button 
        variant="outline" 
        size="sm" 
        onClick={fetchSketches}
        className="w-full"
      >
        <RefreshCw className="h-4 w-4 mr-2" />
        Refresh Sketches
      </Button>
    </div>
  );
};

export default JourneySketchTracker;
