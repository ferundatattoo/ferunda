import { useState, useEffect } from "react";
import { 
  Mic2, 
  Plus, 
  Play, 
  Pause, 
  Trash2, 
  Upload,
  CheckCircle,
  Loader2,
  AlertCircle
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { cn } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import VoiceRecorder from "./VoiceRecorder";

interface VoiceClone {
  id: string;
  display_name: string;
  elevenlabs_voice_id: string | null;
  voice_clone_status: string | null;
  voice_preview_url: string | null;
  training_progress: number | null;
}

const VoiceClonesPanel = () => {
  const [voices, setVoices] = useState<VoiceClone[]>([]);
  const [loading, setLoading] = useState(true);
  const [showNewVoice, setShowNewVoice] = useState(false);
  const [newVoiceName, setNewVoiceName] = useState("");
  const [recordedBlob, setRecordedBlob] = useState<Blob | null>(null);
  const [isCreating, setIsCreating] = useState(false);
  const [playingId, setPlayingId] = useState<string | null>(null);
  const [testText, setTestText] = useState("Hola, este es un mensaje de prueba con mi voz clonada.");
  const [generatingPreview, setGeneratingPreview] = useState<string | null>(null);

  useEffect(() => {
    fetchVoices();
  }, []);

  const fetchVoices = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('ai_avatar_clones')
      .select('id, display_name, elevenlabs_voice_id, voice_clone_status, voice_preview_url, training_progress')
      .order('created_at', { ascending: false });

    if (data) {
      setVoices(data);
    }
    setLoading(false);
  };

  const handleCreateVoice = async () => {
    if (!newVoiceName || !recordedBlob) {
      toast.error("Please provide a name and record your voice");
      return;
    }

    setIsCreating(true);

    try {
      // Upload audio to storage
      const fileName = `voice-${Date.now()}.webm`;
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('voice-samples')
        .upload(fileName, recordedBlob);

      if (uploadError) throw uploadError;

      // Get public URL
      const { data: urlData } = supabase.storage
        .from('voice-samples')
        .getPublicUrl(fileName);

      // Call edge function to clone voice with ElevenLabs
      const response = await supabase.functions.invoke('elevenlabs-voice', {
        body: {
          action: 'clone_voice',
          name: newVoiceName,
          audioUrl: urlData.publicUrl
        }
      });

      if (response.error) throw response.error;

      // Create or update avatar record with voice
      const { error: insertError } = await supabase
        .from('ai_avatar_clones')
        .insert({
          display_name: newVoiceName,
          elevenlabs_voice_id: response.data?.voice_id,
          voice_clone_status: response.data?.voice_id ? 'ready' : 'failed',
          voice_samples_urls: [urlData.publicUrl]
        });

      if (insertError) throw insertError;

      toast.success("Voice clone created successfully!");
      setShowNewVoice(false);
      setNewVoiceName("");
      setRecordedBlob(null);
      fetchVoices();
    } catch (error) {
      console.error("Error creating voice clone:", error);
      toast.error("Failed to create voice clone");
    } finally {
      setIsCreating(false);
    }
  };

  const handlePreviewVoice = async (voice: VoiceClone) => {
    if (!voice.elevenlabs_voice_id) {
      toast.error("Voice not ready for preview");
      return;
    }

    setGeneratingPreview(voice.id);

    try {
      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/elevenlabs-voice`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'apikey': import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
            'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`
          },
          body: JSON.stringify({
            action: 'generate_speech',
            voiceId: voice.elevenlabs_voice_id,
            text: testText
          })
        }
      );

      if (!response.ok) throw new Error('Failed to generate speech');

      const audioBlob = await response.blob();
      const audioUrl = URL.createObjectURL(audioBlob);
      const audio = new Audio(audioUrl);
      
      setPlayingId(voice.id);
      audio.onended = () => setPlayingId(null);
      await audio.play();
    } catch (error) {
      console.error("Error previewing voice:", error);
      toast.error("Failed to preview voice");
    } finally {
      setGeneratingPreview(null);
    }
  };

  const handleDeleteVoice = async (voice: VoiceClone) => {
    if (!confirm(`Delete voice "${voice.display_name}"?`)) return;

    try {
      // Delete from ElevenLabs if exists
      if (voice.elevenlabs_voice_id) {
        await supabase.functions.invoke('elevenlabs-voice', {
          body: {
            action: 'delete_voice',
            voiceId: voice.elevenlabs_voice_id
          }
        });
      }

      // Delete from database
      const { error } = await supabase
        .from('ai_avatar_clones')
        .delete()
        .eq('id', voice.id);

      if (error) throw error;

      toast.success("Voice deleted");
      fetchVoices();
    } catch (error) {
      console.error("Error deleting voice:", error);
      toast.error("Failed to delete voice");
    }
  };

  const getStatusIcon = (status: string | null) => {
    switch (status) {
      case 'ready':
        return <CheckCircle className="w-4 h-4 text-green-500" />;
      case 'training':
      case 'processing':
        return <Loader2 className="w-4 h-4 text-needle-blue animate-spin" />;
      case 'failed':
        return <AlertCircle className="w-4 h-4 text-red-500" />;
      default:
        return <AlertCircle className="w-4 h-4 text-muted-foreground" />;
    }
  };

  return (
    <div className="p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="font-gothic text-2xl text-foreground tracking-wide">
            Voice Clones
          </h1>
          <p className="text-muted-foreground text-sm mt-1">
            Clone your voice for personalized video messages
          </p>
        </div>
        <Button
          onClick={() => setShowNewVoice(!showNewVoice)}
          className="bg-needle-blue hover:bg-needle-blue/90"
        >
          <Plus className="w-4 h-4 mr-2" />
          New Voice
        </Button>
      </div>

      {/* New Voice Form */}
      {showNewVoice && (
        <div className="bg-iron-dark rounded-xl border border-border/30 p-6 mb-6">
          <h3 className="font-medium text-foreground mb-4">Create New Voice Clone</h3>
          
          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium text-foreground mb-2 block">
                Voice Name
              </label>
              <Input
                value={newVoiceName}
                onChange={(e) => setNewVoiceName(e.target.value)}
                placeholder="e.g., Ferunda - Calm"
                className="bg-ink-black border-border/50"
              />
            </div>

            <Tabs defaultValue="record" className="w-full">
              <TabsList className="bg-ink-black">
                <TabsTrigger value="record">
                  <Mic2 className="w-4 h-4 mr-2" />
                  Record
                </TabsTrigger>
                <TabsTrigger value="upload">
                  <Upload className="w-4 h-4 mr-2" />
                  Upload File
                </TabsTrigger>
              </TabsList>
              
              <TabsContent value="record" className="mt-4">
                <VoiceRecorder
                  onRecordingComplete={(blob) => setRecordedBlob(blob)}
                />
              </TabsContent>
              
              <TabsContent value="upload" className="mt-4">
                <div className="border-2 border-dashed border-border/50 rounded-lg p-8 text-center">
                  <Upload className="w-8 h-8 text-muted-foreground mx-auto mb-2" />
                  <p className="text-sm text-muted-foreground">
                    Upload an audio file (MP3, WAV, M4A)
                  </p>
                  <input
                    type="file"
                    accept="audio/*"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) setRecordedBlob(file);
                    }}
                    className="mt-2"
                  />
                </div>
              </TabsContent>
            </Tabs>

            <div className="flex items-center justify-end gap-3 pt-4 border-t border-border/30">
              <Button
                variant="outline"
                onClick={() => {
                  setShowNewVoice(false);
                  setNewVoiceName("");
                  setRecordedBlob(null);
                }}
              >
                Cancel
              </Button>
              <Button
                onClick={handleCreateVoice}
                disabled={!newVoiceName || !recordedBlob || isCreating}
                className="bg-needle-blue hover:bg-needle-blue/90"
              >
                {isCreating ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Creating...
                  </>
                ) : (
                  "Create Voice Clone"
                )}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Test Text Input */}
      <div className="mb-6">
        <label className="text-sm font-medium text-foreground mb-2 block">
          Test Text (for previewing voices)
        </label>
        <Input
          value={testText}
          onChange={(e) => setTestText(e.target.value)}
          placeholder="Enter text to preview..."
          className="bg-iron-dark border-border/50"
        />
      </div>

      {/* Voices List */}
      {loading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="w-8 h-8 text-needle-blue animate-spin" />
        </div>
      ) : voices.length === 0 ? (
        <div className="bg-iron-dark rounded-xl border border-border/30 p-12 text-center">
          <Mic2 className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
          <h3 className="text-lg font-medium text-foreground mb-2">
            No Voice Clones Yet
          </h3>
          <p className="text-muted-foreground mb-4">
            Create your first voice clone to personalize your avatar videos
          </p>
          <Button
            onClick={() => setShowNewVoice(true)}
            className="bg-needle-blue hover:bg-needle-blue/90"
          >
            <Plus className="w-4 h-4 mr-2" />
            Create Voice Clone
          </Button>
        </div>
      ) : (
        <div className="space-y-3">
          {voices.map((voice) => (
            <div
              key={voice.id}
              className="bg-iron-dark rounded-xl border border-border/30 p-4 flex items-center gap-4"
            >
              <div className="w-12 h-12 rounded-full bg-needle-blue/20 flex items-center justify-center">
                <Mic2 className="w-6 h-6 text-needle-blue" />
              </div>
              
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <h3 className="font-medium text-foreground">{voice.display_name}</h3>
                  {getStatusIcon(voice.voice_clone_status)}
                </div>
                <p className="text-sm text-muted-foreground capitalize">
                  Status: {voice.voice_clone_status || 'pending'}
                </p>
                {voice.voice_clone_status === 'training' && voice.training_progress && (
                  <Progress value={voice.training_progress} className="h-1 mt-2 w-32" />
                )}
              </div>

              <div className="flex items-center gap-2">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => handlePreviewVoice(voice)}
                  disabled={voice.voice_clone_status !== 'ready' || generatingPreview === voice.id}
                >
                  {generatingPreview === voice.id ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : playingId === voice.id ? (
                    <Pause className="w-4 h-4" />
                  ) : (
                    <Play className="w-4 h-4" />
                  )}
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => handleDeleteVoice(voice)}
                  className="text-red-500 hover:text-red-400"
                >
                  <Trash2 className="w-4 h-4" />
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default VoiceClonesPanel;
