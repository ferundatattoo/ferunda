import { useState, useEffect } from "react";
import { 
  Play, 
  Loader2, 
  Plus, 
  ChevronDown,
  Sparkles,
  Download,
  RotateCcw
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from "@/components/ui/select";
import { cn } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";
import QuickScriptChips from "./QuickScriptChips";
import VideoPreview from "./VideoPreview";
import AvatarTrainerModal from "./AvatarTrainerModal";

interface Avatar {
  id: string;
  display_name: string;
  avatar_photo_url: string | null;
  status: string | null;
}

interface VoiceClone {
  id: string;
  display_name: string;
  elevenlabs_voice_id: string | null;
  voice_clone_status: string | null;
}

const CreateVideoPanel = () => {
  const [script, setScript] = useState("");
  const [selectedAvatar, setSelectedAvatar] = useState<string | null>(null);
  const [selectedVoice, setSelectedVoice] = useState<string>("");
  const [isGenerating, setIsGenerating] = useState(false);
  const [generationProgress, setGenerationProgress] = useState(0);
  const [generatedVideoUrl, setGeneratedVideoUrl] = useState<string | null>(null);
  const [avatars, setAvatars] = useState<Avatar[]>([]);
  const [voices, setVoices] = useState<VoiceClone[]>([]);
  const [showTrainerModal, setShowTrainerModal] = useState(false);

  const MAX_CHARS = 500;

  useEffect(() => {
    fetchAvatars();
    fetchVoices();
  }, []);

  const fetchAvatars = async () => {
    const { data } = await supabase
      .from('ai_avatar_clones')
      .select('id, display_name, avatar_photo_url, status')
      .order('created_at', { ascending: false });
    
    if (data) {
      setAvatars(data);
      if (data.length > 0 && !selectedAvatar) {
        setSelectedAvatar(data[0].id);
      }
    }
  };

  const fetchVoices = async () => {
    const { data } = await supabase
      .from('ai_avatar_clones')
      .select('id, display_name, elevenlabs_voice_id, voice_clone_status')
      .not('elevenlabs_voice_id', 'is', null)
      .order('created_at', { ascending: false });
    
    if (data) {
      setVoices(data);
      if (data.length > 0 && !selectedVoice) {
        setSelectedVoice(data[0].id);
      }
    }
  };

  const handleGenerate = async () => {
    if (!script.trim() || !selectedAvatar) return;

    setIsGenerating(true);
    setGenerationProgress(0);
    setGeneratedVideoUrl(null);

    // Simulate progress for demo
    const progressInterval = setInterval(() => {
      setGenerationProgress(prev => {
        if (prev >= 95) {
          clearInterval(progressInterval);
          return 95;
        }
        return prev + Math.random() * 15;
      });
    }, 500);

    try {
      // TODO: Connect to HeyGen API for video generation
      // TODO: Connect to ElevenLabs API for TTS
      const response = await supabase.functions.invoke('generate-avatar-video', {
        body: {
          avatarId: selectedAvatar,
          voiceId: selectedVoice,
          script: script.trim()
        }
      });

      if (response.data?.video_url) {
        setGeneratedVideoUrl(response.data.video_url);
      }

      setGenerationProgress(100);
    } catch (error) {
      console.error('Error generating video:', error);
    } finally {
      clearInterval(progressInterval);
      setTimeout(() => {
        setIsGenerating(false);
      }, 500);
    }
  };

  const handleScriptInsert = (template: string) => {
    setScript(template);
  };

  return (
    <div className="p-6 h-full">
      {/* Header */}
      <div className="mb-6">
        <h1 className="font-gothic text-2xl text-foreground tracking-wide">
          Create Video
        </h1>
        <p className="text-muted-foreground text-sm mt-1">
          Generate personalized video messages with your AI avatar
        </p>
      </div>

      {/* Two Column Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 h-[calc(100%-80px)]">
        {/* Left Column - Script Input */}
        <div className="space-y-6">
          {/* Quick Insert Chips */}
          <div>
            <label className="text-sm font-medium text-foreground mb-2 block">
              Quick Insert
            </label>
            <QuickScriptChips onSelect={handleScriptInsert} />
          </div>

          {/* Script Textarea */}
          <div>
            <label className="text-sm font-medium text-foreground mb-2 block">
              Your Script
            </label>
            <div className="relative">
              <Textarea
                value={script}
                onChange={(e) => setScript(e.target.value.slice(0, MAX_CHARS))}
                placeholder="Write your video script here..."
                className="min-h-[200px] bg-iron-dark border-border/50 focus:border-needle-blue resize-none"
              />
              <div className="absolute bottom-3 right-3 text-xs text-muted-foreground">
                {script.length}/{MAX_CHARS}
              </div>
            </div>
          </div>

          {/* Avatar Selector */}
          <div>
            <label className="text-sm font-medium text-foreground mb-3 block">
              Select Avatar
            </label>
            <div className="flex items-center gap-3 overflow-x-auto pb-2">
              {avatars.map((avatar) => (
                <button
                  key={avatar.id}
                  onClick={() => setSelectedAvatar(avatar.id)}
                  className={cn(
                    "relative flex-shrink-0 w-16 h-16 rounded-full overflow-hidden border-2 transition-all",
                    selectedAvatar === avatar.id
                      ? "border-needle-blue ring-2 ring-needle-blue/30"
                      : "border-border/50 hover:border-border"
                  )}
                >
                  {avatar.avatar_photo_url ? (
                    <img 
                      src={avatar.avatar_photo_url} 
                      alt={avatar.display_name}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full bg-iron-dark flex items-center justify-center text-muted-foreground text-xl font-bold">
                      {avatar.display_name.charAt(0)}
                    </div>
                  )}
                  {avatar.status === 'ready' && (
                    <div className="absolute bottom-0 right-0 w-4 h-4 bg-green-500 rounded-full border-2 border-iron-dark" />
                  )}
                </button>
              ))}
              <button
                onClick={() => setShowTrainerModal(true)}
                className="flex-shrink-0 w-16 h-16 rounded-full border-2 border-dashed border-border/50 hover:border-needle-blue flex items-center justify-center transition-colors"
              >
                <Plus className="w-6 h-6 text-muted-foreground" />
              </button>
            </div>
          </div>

          {/* Voice Selector */}
          <div>
            <label className="text-sm font-medium text-foreground mb-2 block">
              Voice
            </label>
            <Select value={selectedVoice} onValueChange={setSelectedVoice}>
              <SelectTrigger className="bg-iron-dark border-border/50">
                <SelectValue placeholder="Select a voice" />
              </SelectTrigger>
              <SelectContent>
                {voices.length > 0 ? (
                  voices.map((voice) => (
                    <SelectItem key={voice.id} value={voice.id}>
                      {voice.display_name} - {voice.voice_clone_status === 'ready' ? 'Ready' : 'Training...'}
                    </SelectItem>
                  ))
                ) : (
                  <SelectItem value="default" disabled>
                    No voice clones available
                  </SelectItem>
                )}
              </SelectContent>
            </Select>
          </div>

          {/* Generate Button */}
          <Button
            onClick={handleGenerate}
            disabled={!script.trim() || !selectedAvatar || isGenerating}
            className="w-full h-14 bg-gradient-to-r from-needle-blue to-needle-blue/80 hover:from-needle-blue/90 hover:to-needle-blue/70 text-white font-semibold text-lg"
          >
            {isGenerating ? (
              <>
                <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                Rendering Neural Frames...
              </>
            ) : (
              <>
                <Sparkles className="w-5 h-5 mr-2" />
                Generate Video
              </>
            )}
          </Button>
        </div>

        {/* Right Column - Video Preview */}
        <div className="bg-iron-dark rounded-xl border border-border/30 p-6 flex flex-col">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-medium text-foreground">Video Preview</h3>
            {generatedVideoUrl && (
              <div className="flex items-center gap-2">
                <Button variant="ghost" size="sm">
                  <RotateCcw className="w-4 h-4 mr-1" />
                  Regenerate
                </Button>
                <Button variant="ghost" size="sm">
                  <Download className="w-4 h-4 mr-1" />
                  Download
                </Button>
              </div>
            )}
          </div>

          <VideoPreview
            isGenerating={isGenerating}
            progress={generationProgress}
            videoUrl={generatedVideoUrl}
          />
        </div>
      </div>

      {/* Avatar Trainer Modal */}
      <AvatarTrainerModal
        open={showTrainerModal}
        onOpenChange={setShowTrainerModal}
        onComplete={() => {
          fetchAvatars();
          setShowTrainerModal(false);
        }}
      />
    </div>
  );
};

export default CreateVideoPanel;
