import { useState } from "react";
import { 
  Key, 
  Bell, 
  Globe, 
  Shield,
  CheckCircle,
  AlertCircle,
  ExternalLink
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "sonner";

const SettingsPanel = () => {
  const [elevenLabsConnected, setElevenLabsConnected] = useState(true);
  const [heyGenConnected, setHeyGenConnected] = useState(false);
  const [notifications, setNotifications] = useState({
    videoComplete: true,
    trainingComplete: true,
    weeklyReport: false
  });

  const handleTestConnection = (service: string) => {
    toast.success(`${service} connection verified!`);
  };

  return (
    <div className="p-6 max-w-4xl">
      {/* Header */}
      <div className="mb-8">
        <h1 className="font-gothic text-2xl text-foreground tracking-wide">
          Settings
        </h1>
        <p className="text-muted-foreground text-sm mt-1">
          Configure your Avatar Studio preferences and integrations
        </p>
      </div>

      <div className="space-y-6">
        {/* API Integrations */}
        <Card className="bg-iron-dark border-border/30">
          <CardHeader>
            <CardTitle className="text-foreground flex items-center gap-2">
              <Key className="w-5 h-5 text-needle-blue" />
              API Integrations
            </CardTitle>
            <CardDescription>
              Connect external services for video and voice generation
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* ElevenLabs */}
            <div className="flex items-center justify-between p-4 bg-ink-black rounded-lg">
              <div className="flex items-center gap-4">
                <div className="w-10 h-10 rounded-lg bg-gothic-gold/20 flex items-center justify-center">
                  <span className="text-gothic-gold font-bold">11</span>
                </div>
                <div>
                  <h4 className="font-medium text-foreground">ElevenLabs</h4>
                  <p className="text-sm text-muted-foreground">Voice cloning and TTS</p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                {elevenLabsConnected ? (
                  <span className="flex items-center gap-1 text-sm text-green-500">
                    <CheckCircle className="w-4 h-4" />
                    Connected
                  </span>
                ) : (
                  <span className="flex items-center gap-1 text-sm text-red-500">
                    <AlertCircle className="w-4 h-4" />
                    Not Connected
                  </span>
                )}
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleTestConnection('ElevenLabs')}
                >
                  Test
                </Button>
              </div>
            </div>

            {/* HeyGen */}
            <div className="flex items-center justify-between p-4 bg-ink-black rounded-lg">
              <div className="flex items-center gap-4">
                <div className="w-10 h-10 rounded-lg bg-needle-blue/20 flex items-center justify-center">
                  <span className="text-needle-blue font-bold">HG</span>
                </div>
                <div>
                  <h4 className="font-medium text-foreground">HeyGen</h4>
                  <p className="text-sm text-muted-foreground">Avatar video generation</p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                {heyGenConnected ? (
                  <span className="flex items-center gap-1 text-sm text-green-500">
                    <CheckCircle className="w-4 h-4" />
                    Connected
                  </span>
                ) : (
                  <span className="flex items-center gap-1 text-sm text-muted-foreground">
                    <AlertCircle className="w-4 h-4" />
                    Optional
                  </span>
                )}
                <Button
                  variant="outline"
                  size="sm"
                  asChild
                >
                  <a href="https://heygen.com" target="_blank" rel="noopener noreferrer">
                    Connect
                    <ExternalLink className="w-3 h-3 ml-1" />
                  </a>
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Notifications */}
        <Card className="bg-iron-dark border-border/30">
          <CardHeader>
            <CardTitle className="text-foreground flex items-center gap-2">
              <Bell className="w-5 h-5 text-needle-blue" />
              Notifications
            </CardTitle>
            <CardDescription>
              Configure when you receive notifications
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <Label className="text-foreground">Video Generation Complete</Label>
                <p className="text-sm text-muted-foreground">
                  Get notified when a video finishes rendering
                </p>
              </div>
              <Switch
                checked={notifications.videoComplete}
                onCheckedChange={(checked) => 
                  setNotifications(prev => ({ ...prev, videoComplete: checked }))
                }
              />
            </div>
            <div className="flex items-center justify-between">
              <div>
                <Label className="text-foreground">Avatar Training Complete</Label>
                <p className="text-sm text-muted-foreground">
                  Get notified when an avatar finishes training
                </p>
              </div>
              <Switch
                checked={notifications.trainingComplete}
                onCheckedChange={(checked) => 
                  setNotifications(prev => ({ ...prev, trainingComplete: checked }))
                }
              />
            </div>
            <div className="flex items-center justify-between">
              <div>
                <Label className="text-foreground">Weekly Performance Report</Label>
                <p className="text-sm text-muted-foreground">
                  Receive a weekly summary of video engagement
                </p>
              </div>
              <Switch
                checked={notifications.weeklyReport}
                onCheckedChange={(checked) => 
                  setNotifications(prev => ({ ...prev, weeklyReport: checked }))
                }
              />
            </div>
          </CardContent>
        </Card>

        {/* Default Settings */}
        <Card className="bg-iron-dark border-border/30">
          <CardHeader>
            <CardTitle className="text-foreground flex items-center gap-2">
              <Globe className="w-5 h-5 text-needle-blue" />
              Default Settings
            </CardTitle>
            <CardDescription>
              Configure default behavior for video generation
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label className="text-foreground mb-2 block">Default Language</Label>
              <select className="w-full bg-ink-black border border-border/50 rounded-lg px-3 py-2 text-foreground">
                <option value="es">Español</option>
                <option value="en">English</option>
                <option value="pt">Português</option>
              </select>
            </div>
            <div>
              <Label className="text-foreground mb-2 block">Video Resolution</Label>
              <select className="w-full bg-ink-black border border-border/50 rounded-lg px-3 py-2 text-foreground">
                <option value="1080p">1080p (Full HD)</option>
                <option value="720p">720p (HD)</option>
                <option value="480p">480p (SD)</option>
              </select>
            </div>
          </CardContent>
        </Card>

        {/* Data & Privacy */}
        <Card className="bg-iron-dark border-border/30">
          <CardHeader>
            <CardTitle className="text-foreground flex items-center gap-2">
              <Shield className="w-5 h-5 text-needle-blue" />
              Data & Privacy
            </CardTitle>
            <CardDescription>
              Manage your data and privacy settings
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="p-4 bg-ink-black rounded-lg">
              <h4 className="font-medium text-foreground mb-2">Consent Recordings</h4>
              <p className="text-sm text-muted-foreground mb-3">
                All avatar consent recordings are stored securely and can be accessed for legal compliance.
              </p>
              <Button variant="outline" size="sm">
                View Consent Records
              </Button>
            </div>
            <div className="p-4 bg-ink-black rounded-lg">
              <h4 className="font-medium text-foreground mb-2">Delete All Data</h4>
              <p className="text-sm text-muted-foreground mb-3">
                Permanently delete all avatars, voice clones, and generated videos.
              </p>
              <Button variant="destructive" size="sm">
                Delete All Data
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default SettingsPanel;
