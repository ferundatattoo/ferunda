import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  MessageCircle,
  Instagram,
  Mail,
  Phone,
  Check,
  Loader2,
  ExternalLink,
  AlertCircle,
  X,
  Sparkles,
  ArrowRight,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

// ============================================================================
// TYPES
// ============================================================================

type ChannelId = "instagram" | "whatsapp" | "email" | "tiktok";
type ConnectionStatus = "disconnected" | "connecting" | "connected" | "error";

interface Channel {
  id: ChannelId;
  name: string;
  icon: typeof Instagram;
  description: string;
  color: string;
  status: ConnectionStatus;
  accountInfo?: string;
}

interface OmnichannelWizardProps {
  workspaceId: string;
  onComplete?: () => void;
}

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export function OmnichannelWizard({ workspaceId, onComplete }: OmnichannelWizardProps) {
  const [channels, setChannels] = useState<Channel[]>([
    {
      id: "instagram",
      name: "Instagram",
      icon: Instagram,
      description: "DMs & comments from your IG",
      color: "from-pink-500 to-purple-600",
      status: "disconnected",
    },
    {
      id: "whatsapp",
      name: "WhatsApp",
      icon: Phone,
      description: "Business messages & inquiries",
      color: "from-green-500 to-green-600",
      status: "disconnected",
    },
    {
      id: "email",
      name: "Email",
      icon: Mail,
      description: "Booking emails & newsletters",
      color: "from-blue-500 to-blue-600",
      status: "disconnected",
    },
    {
      id: "tiktok",
      name: "TikTok",
      icon: MessageCircle,
      description: "Comments & DM requests",
      color: "from-gray-800 to-gray-900",
      status: "disconnected",
    },
  ]);

  const [connectingChannel, setConnectingChannel] = useState<ChannelId | null>(null);
  const [showSuccess, setShowSuccess] = useState(false);

  const updateChannelStatus = (channelId: ChannelId, status: ConnectionStatus, accountInfo?: string) => {
    setChannels((prev) =>
      prev.map((ch) =>
        ch.id === channelId ? { ...ch, status, accountInfo } : ch
      )
    );
  };

  const connectChannel = async (channelId: ChannelId) => {
    setConnectingChannel(channelId);
    updateChannelStatus(channelId, "connecting");

    try {
      // Different connection flows per channel
      switch (channelId) {
        case "instagram":
          await connectInstagram();
          break;
        case "whatsapp":
          await connectWhatsApp();
          break;
        case "email":
          await connectEmail();
          break;
        case "tiktok":
          await connectTikTok();
          break;
      }

      updateChannelStatus(channelId, "connected", getAccountPlaceholder(channelId));
      toast.success(`${channelId.charAt(0).toUpperCase() + channelId.slice(1)} connected!`);
      
      // Check if all major channels connected
      const connectedCount = channels.filter(ch => ch.status === "connected").length + 1;
      if (connectedCount >= 2) {
        setShowSuccess(true);
      }
    } catch (error) {
      console.error(`Failed to connect ${channelId}:`, error);
      updateChannelStatus(channelId, "error");
      toast.error(`Failed to connect ${channelId}. Please try again.`);
    } finally {
      setConnectingChannel(null);
    }
  };

  const connectInstagram = async () => {
    // In production, this would open OAuth popup
    const { data, error } = await supabase.functions.invoke("social-webhook", {
      body: {
        action: "initiate_oauth",
        platform: "instagram",
        workspace_id: workspaceId,
      },
    });

    if (error) throw error;

    // Simulate OAuth flow (in production, would redirect)
    if (data?.authUrl) {
      window.open(data.authUrl, "_blank", "width=600,height=700");
    }
    
    // For demo, simulate success after short delay
    await new Promise(resolve => setTimeout(resolve, 1500));
  };

  const connectWhatsApp = async () => {
    // WhatsApp Business API flow
    const { error } = await supabase.functions.invoke("social-webhook", {
      body: {
        action: "setup_whatsapp",
        workspace_id: workspaceId,
      },
    });

    if (error) throw error;
    await new Promise(resolve => setTimeout(resolve, 1500));
  };

  const connectEmail = async () => {
    // Email IMAP/SMTP or SendGrid setup
    const { error } = await supabase.functions.invoke("social-webhook", {
      body: {
        action: "setup_email",
        workspace_id: workspaceId,
      },
    });

    if (error) throw error;
    await new Promise(resolve => setTimeout(resolve, 1000));
  };

  const connectTikTok = async () => {
    // TikTok OAuth
    const { data, error } = await supabase.functions.invoke("social-webhook", {
      body: {
        action: "initiate_oauth",
        platform: "tiktok",
        workspace_id: workspaceId,
      },
    });

    if (error) throw error;
    
    if (data?.authUrl) {
      window.open(data.authUrl, "_blank", "width=600,height=700");
    }
    
    await new Promise(resolve => setTimeout(resolve, 1500));
  };

  const getAccountPlaceholder = (channelId: ChannelId): string => {
    switch (channelId) {
      case "instagram": return "@ferunda.ink";
      case "whatsapp": return "+1 (555) 123-4567";
      case "email": return "hello@ferunda.art";
      case "tiktok": return "@ferunda.tattoo";
      default: return "";
    }
  };

  const connectedCount = channels.filter(ch => ch.status === "connected").length;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="text-center space-y-2">
        <div className="inline-flex items-center gap-2 px-3 py-1 bg-primary/10 rounded-full">
          <Sparkles className="h-4 w-4 text-primary" />
          <span className="text-sm font-medium text-primary">2-Click Setup</span>
        </div>
        <h2 className="text-2xl font-editorial text-foreground">Connect Your Channels</h2>
        <p className="text-muted-foreground max-w-md mx-auto">
          Bring all your messages into one inbox. Click to connect — we handle the rest.
        </p>
      </div>

      {/* Progress */}
      <div className="flex items-center justify-center gap-2">
        {channels.map((ch, i) => (
          <div
            key={ch.id}
            className={`w-3 h-3 rounded-full transition-colors ${
              ch.status === "connected"
                ? "bg-green-500"
                : ch.status === "connecting"
                ? "bg-yellow-500 animate-pulse"
                : "bg-muted"
            }`}
          />
        ))}
        <span className="ml-2 text-sm text-muted-foreground">
          {connectedCount}/{channels.length} connected
        </span>
      </div>

      {/* Channel Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {channels.map((channel) => (
          <motion.div
            key={channel.id}
            layout
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
          >
            <Card
              className={`relative overflow-hidden transition-all cursor-pointer hover:shadow-lg ${
                channel.status === "connected"
                  ? "border-green-500/50 bg-green-500/5"
                  : channel.status === "error"
                  ? "border-destructive/50"
                  : "hover:border-primary/50"
              }`}
              onClick={() => channel.status === "disconnected" && connectChannel(channel.id)}
            >
              {/* Gradient accent */}
              <div
                className={`absolute top-0 left-0 right-0 h-1 bg-gradient-to-r ${channel.color}`}
              />

              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div
                      className={`p-2 rounded-lg bg-gradient-to-br ${channel.color} text-white`}
                    >
                      <channel.icon className="h-5 w-5" />
                    </div>
                    <div>
                      <CardTitle className="text-base">{channel.name}</CardTitle>
                      <CardDescription className="text-xs">
                        {channel.description}
                      </CardDescription>
                    </div>
                  </div>

                  {/* Status Badge */}
                  {channel.status === "connected" && (
                    <Badge className="bg-green-500/20 text-green-600 border-0">
                      <Check className="h-3 w-3 mr-1" />
                      Connected
                    </Badge>
                  )}
                  {channel.status === "connecting" && (
                    <Badge variant="secondary">
                      <Loader2 className="h-3 w-3 mr-1 animate-spin" />
                      Connecting...
                    </Badge>
                  )}
                  {channel.status === "error" && (
                    <Badge variant="destructive">
                      <AlertCircle className="h-3 w-3 mr-1" />
                      Error
                    </Badge>
                  )}
                </div>
              </CardHeader>

              <CardContent className="pt-0">
                {channel.status === "connected" && channel.accountInfo ? (
                  <p className="text-sm text-muted-foreground flex items-center gap-2">
                    <Check className="h-4 w-4 text-green-500" />
                    {channel.accountInfo}
                  </p>
                ) : channel.status === "disconnected" ? (
                  <Button
                    variant="ghost"
                    className="w-full justify-between group"
                    disabled={connectingChannel !== null}
                  >
                    <span>Click to connect</span>
                    <ArrowRight className="h-4 w-4 group-hover:translate-x-1 transition-transform" />
                  </Button>
                ) : channel.status === "error" ? (
                  <Button
                    variant="outline"
                    size="sm"
                    className="w-full"
                    onClick={(e) => {
                      e.stopPropagation();
                      updateChannelStatus(channel.id, "disconnected");
                    }}
                  >
                    Try again
                  </Button>
                ) : null}
              </CardContent>
            </Card>
          </motion.div>
        ))}
      </div>

      {/* Success State */}
      <AnimatePresence>
        {showSuccess && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm"
          >
            <Card className="max-w-md mx-4 text-center">
              <CardHeader>
                <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-green-500/20 flex items-center justify-center">
                  <Check className="h-8 w-8 text-green-500" />
                </div>
                <CardTitle>You're All Set! 🎉</CardTitle>
                <CardDescription>
                  Your channels are connected. All messages will now appear in your unified inbox.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Button onClick={() => {
                  setShowSuccess(false);
                  onComplete?.();
                }} className="w-full">
                  Go to Inbox
                </Button>
              </CardContent>
            </Card>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Skip Option */}
      {connectedCount === 0 && (
        <div className="text-center">
          <Button variant="ghost" size="sm" onClick={onComplete}>
            Skip for now
          </Button>
        </div>
      )}
    </div>
  );
}

export default OmnichannelWizard;
