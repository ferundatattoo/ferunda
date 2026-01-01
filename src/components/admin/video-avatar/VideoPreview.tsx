import { Play, Loader2, Sparkles } from "lucide-react";
import { Progress } from "@/components/ui/progress";
import { cn } from "@/lib/utils";

interface VideoPreviewProps {
  isGenerating: boolean;
  progress: number;
  videoUrl: string | null;
}

const VideoPreview = ({ isGenerating, progress, videoUrl }: VideoPreviewProps) => {
  if (isGenerating) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center bg-ink-black rounded-lg">
        <div className="relative mb-6">
          <div className="w-20 h-20 rounded-full bg-needle-blue/20 flex items-center justify-center animate-pulse">
            <Loader2 className="w-10 h-10 text-needle-blue animate-spin" />
          </div>
          <div className="absolute -inset-4 rounded-full border-2 border-needle-blue/30 animate-ping" />
        </div>
        
        <div className="text-center mb-6">
          <h3 className="font-gothic text-xl text-foreground mb-1 tracking-wide">
            RENDERING
          </h3>
          <p className="text-sm text-needle-blue animate-pulse">
            Neural Frames...
          </p>
        </div>

        <div className="w-64 space-y-2">
          <Progress value={progress} className="h-2 bg-iron-dark" />
          <p className="text-xs text-center text-muted-foreground">
            {Math.round(progress)}% Complete
          </p>
        </div>

        <div className="mt-6 text-xs text-muted-foreground text-center max-w-xs">
          {progress < 30 && "Analyzing speech patterns..."}
          {progress >= 30 && progress < 60 && "Generating lip sync..."}
          {progress >= 60 && progress < 90 && "Rendering avatar animation..."}
          {progress >= 90 && "Finalizing video..."}
        </div>
      </div>
    );
  }

  if (videoUrl) {
    return (
      <div className="flex-1 flex items-center justify-center bg-ink-black rounded-lg overflow-hidden">
        <video
          src={videoUrl}
          controls
          className="max-w-full max-h-full rounded-lg"
        />
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col items-center justify-center bg-ink-black rounded-lg border border-dashed border-border/30">
      <div className="w-16 h-16 rounded-full bg-iron-dark flex items-center justify-center mb-4">
        <Play className="w-8 h-8 text-muted-foreground" />
      </div>
      <p className="text-muted-foreground text-sm text-center">
        Your generated video will appear here
      </p>
      <p className="text-muted-foreground/60 text-xs mt-2 text-center max-w-xs">
        Write a script, select your avatar and voice, then click Generate
      </p>
    </div>
  );
};

export default VideoPreview;
