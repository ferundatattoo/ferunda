import { useState, useEffect } from "react";
import { 
  Plus, 
  Trash2, 
  CheckCircle, 
  Loader2, 
  AlertCircle,
  MoreHorizontal,
  Edit,
  Video
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Progress } from "@/components/ui/progress";
import { cn } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import AvatarTrainerModal from "./AvatarTrainerModal";

interface Avatar {
  id: string;
  display_name: string;
  avatar_photo_url: string | null;
  status: string | null;
  training_progress: number | null;
  created_at: string;
  elevenlabs_voice_id: string | null;
  voice_clone_status: string | null;
}

const MyAvatarsPanel = () => {
  const [avatars, setAvatars] = useState<Avatar[]>([]);
  const [loading, setLoading] = useState(true);
  const [showTrainerModal, setShowTrainerModal] = useState(false);

  useEffect(() => {
    fetchAvatars();
  }, []);

  const fetchAvatars = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('ai_avatar_clones')
      .select('id, display_name, avatar_photo_url, status, training_progress, created_at, elevenlabs_voice_id, voice_clone_status')
      .order('created_at', { ascending: false });

    if (data) {
      setAvatars(data);
    }
    setLoading(false);
  };

  const handleDelete = async (avatar: Avatar) => {
    if (!confirm(`Delete avatar "${avatar.display_name}"?`)) return;

    try {
      const { error } = await supabase
        .from('ai_avatar_clones')
        .delete()
        .eq('id', avatar.id);

      if (error) throw error;

      toast.success("Avatar deleted");
      fetchAvatars();
    } catch (error) {
      console.error("Error deleting avatar:", error);
      toast.error("Failed to delete avatar");
    }
  };

  const getStatusBadge = (status: string | null) => {
    switch (status) {
      case 'ready':
        return (
          <span className="flex items-center gap-1 text-xs text-green-500">
            <CheckCircle className="w-3 h-3" />
            Ready
          </span>
        );
      case 'training':
        return (
          <span className="flex items-center gap-1 text-xs text-needle-blue">
            <Loader2 className="w-3 h-3 animate-spin" />
            Training
          </span>
        );
      case 'failed':
        return (
          <span className="flex items-center gap-1 text-xs text-red-500">
            <AlertCircle className="w-3 h-3" />
            Failed
          </span>
        );
      default:
        return (
          <span className="flex items-center gap-1 text-xs text-muted-foreground">
            <AlertCircle className="w-3 h-3" />
            Pending
          </span>
        );
    }
  };

  return (
    <div className="p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="font-gothic text-2xl text-foreground tracking-wide">
            My Avatars
          </h1>
          <p className="text-muted-foreground text-sm mt-1">
            Manage your AI avatar clones
          </p>
        </div>
        <Button
          onClick={() => setShowTrainerModal(true)}
          className="bg-needle-blue hover:bg-needle-blue/90"
        >
          <Plus className="w-4 h-4 mr-2" />
          Create Avatar
        </Button>
      </div>

      {/* Avatars Grid */}
      {loading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="w-8 h-8 text-needle-blue animate-spin" />
        </div>
      ) : avatars.length === 0 ? (
        <div className="bg-iron-dark rounded-xl border border-border/30 p-12 text-center">
          <Video className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
          <h3 className="text-lg font-medium text-foreground mb-2">
            No Avatars Yet
          </h3>
          <p className="text-muted-foreground mb-4">
            Create your first AI avatar to start generating personalized videos
          </p>
          <Button
            onClick={() => setShowTrainerModal(true)}
            className="bg-needle-blue hover:bg-needle-blue/90"
          >
            <Plus className="w-4 h-4 mr-2" />
            Create Avatar
          </Button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {avatars.map((avatar) => (
            <div
              key={avatar.id}
              className="bg-iron-dark rounded-xl border border-border/30 overflow-hidden"
            >
              {/* Avatar Image */}
              <div className="aspect-square bg-ink-black relative">
                {avatar.avatar_photo_url ? (
                  <img
                    src={avatar.avatar_photo_url}
                    alt={avatar.display_name}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-6xl font-bold text-muted-foreground/30">
                    {avatar.display_name.charAt(0)}
                  </div>
                )}
                
                {/* Status Overlay */}
                {avatar.status === 'training' && (
                  <div className="absolute inset-0 bg-ink-black/80 flex flex-col items-center justify-center">
                    <Loader2 className="w-8 h-8 text-needle-blue animate-spin mb-3" />
                    <p className="text-sm text-foreground mb-2">Training...</p>
                    {avatar.training_progress && (
                      <Progress value={avatar.training_progress} className="w-32 h-1" />
                    )}
                  </div>
                )}
              </div>

              {/* Avatar Info */}
              <div className="p-4">
                <div className="flex items-start justify-between">
                  <div>
                    <h3 className="font-medium text-foreground">{avatar.display_name}</h3>
                    <div className="flex items-center gap-2 mt-1">
                      {getStatusBadge(avatar.status)}
                      {avatar.elevenlabs_voice_id && (
                        <span className="text-xs text-gothic-gold">
                          Voice Ready
                        </span>
                      )}
                    </div>
                  </div>
                  
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="sm">
                        <MoreHorizontal className="w-4 h-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem>
                        <Edit className="w-4 h-4 mr-2" />
                        Edit
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        onClick={() => handleDelete(avatar)}
                        className="text-red-500"
                      >
                        <Trash2 className="w-4 h-4 mr-2" />
                        Delete
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>

                <p className="text-xs text-muted-foreground mt-3">
                  Created {new Date(avatar.created_at).toLocaleDateString()}
                </p>
              </div>
            </div>
          ))}
        </div>
      )}

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

export default MyAvatarsPanel;
