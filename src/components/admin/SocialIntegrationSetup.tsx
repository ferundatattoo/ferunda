import { useState, forwardRef } from "react";
import { motion } from "framer-motion";
import { 
  MessageCircle, Instagram, ExternalLink, 
  CheckCircle, AlertCircle, Copy, Settings
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";

interface IntegrationStatus {
  whatsapp: "not_configured" | "pending" | "connected";
  instagram: "not_configured" | "pending" | "connected";
}

const SocialIntegrationSetup = forwardRef<HTMLDivElement>((_, ref) => {
  const { toast } = useToast();
  const [status] = useState<IntegrationStatus>({
    whatsapp: "not_configured",
    instagram: "not_configured",
  });
  const [webhookUrl] = useState(`${window.location.origin}/api/webhooks/social`);

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast({ title: "Copied!", description: "Webhook URL copied to clipboard" });
  };

  return (
    <div ref={ref} className="space-y-6">
      <div>
        <h2 className="font-display text-2xl text-foreground">Social Integrations</h2>
        <p className="text-muted-foreground text-sm mt-1">
          Connect WhatsApp Business and Instagram to manage all conversations in one place
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* WhatsApp Business */}
        <Card className="bg-card border-border">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-[#25D366]/10 rounded-lg">
                  <MessageCircle className="w-6 h-6 text-[#25D366]" />
                </div>
                <div>
                  <CardTitle className="font-display text-lg">WhatsApp Business</CardTitle>
                  <CardDescription>Cloud API Integration</CardDescription>
                </div>
              </div>
              <Badge 
                variant={status.whatsapp === "connected" ? "default" : "secondary"}
                className={status.whatsapp === "connected" ? "bg-[#25D366]" : ""}
              >
                {status.whatsapp === "connected" ? (
                  <><CheckCircle className="w-3 h-3 mr-1" /> Connected</>
                ) : status.whatsapp === "pending" ? (
                  <><AlertCircle className="w-3 h-3 mr-1" /> Pending</>
                ) : (
                  "Not Configured"
                )}
              </Badge>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="p-4 bg-muted/50 rounded-lg space-y-3">
              <h4 className="font-body text-sm font-medium text-foreground">Setup Steps:</h4>
              <ol className="text-sm text-muted-foreground space-y-2 list-decimal list-inside">
                <li>Create a Meta Business account at <a href="https://business.facebook.com" target="_blank" rel="noopener" className="text-primary hover:underline">business.facebook.com</a></li>
                <li>Set up WhatsApp Business Platform in Meta Developer Console</li>
                <li>Create a System User and generate access token</li>
                <li>Configure the webhook URL below</li>
                <li>Verify your business and phone number</li>
              </ol>
            </div>

            <div className="space-y-2">
              <Label htmlFor="whatsapp-webhook">Webhook URL</Label>
              <div className="flex gap-2">
                <Input 
                  id="whatsapp-webhook"
                  value={webhookUrl}
                  readOnly
                  className="font-mono text-xs"
                />
                <Button 
                  variant="outline" 
                  size="icon"
                  onClick={() => copyToClipboard(webhookUrl)}
                >
                  <Copy className="w-4 h-4" />
                </Button>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="whatsapp-token">Access Token</Label>
              <Input 
                id="whatsapp-token"
                type="password"
                placeholder="Enter your WhatsApp Cloud API token..."
                disabled
              />
              <p className="text-xs text-muted-foreground">
                Token management coming soon. Contact support to configure.
              </p>
            </div>

            <Button variant="outline" className="w-full" asChild>
              <a 
                href="https://developers.facebook.com/docs/whatsapp/cloud-api/get-started" 
                target="_blank" 
                rel="noopener"
              >
                <ExternalLink className="w-4 h-4 mr-2" />
                View Documentation
              </a>
            </Button>
          </CardContent>
        </Card>

        {/* Instagram DMs */}
        <Card className="bg-card border-border">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-gradient-to-br from-purple-500/10 to-pink-500/10 rounded-lg">
                  <Instagram className="w-6 h-6 text-pink-500" />
                </div>
                <div>
                  <CardTitle className="font-display text-lg">Instagram DMs</CardTitle>
                  <CardDescription>Messenger API for Instagram</CardDescription>
                </div>
              </div>
              <Badge 
                variant={status.instagram === "connected" ? "default" : "secondary"}
                className={status.instagram === "connected" ? "bg-pink-500" : ""}
              >
                {status.instagram === "connected" ? (
                  <><CheckCircle className="w-3 h-3 mr-1" /> Connected</>
                ) : status.instagram === "pending" ? (
                  <><AlertCircle className="w-3 h-3 mr-1" /> Pending</>
                ) : (
                  "Not Configured"
                )}
              </Badge>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="p-4 bg-muted/50 rounded-lg space-y-3">
              <h4 className="font-body text-sm font-medium text-foreground">Setup Steps:</h4>
              <ol className="text-sm text-muted-foreground space-y-2 list-decimal list-inside">
                <li>Connect Instagram account to a Facebook Page</li>
                <li>Set up Instagram Messaging in Meta Developer Console</li>
                <li>Enable Messenger API for Instagram</li>
                <li>Configure webhook with the URL below</li>
                <li>Subscribe to message events</li>
              </ol>
            </div>

            <div className="space-y-2">
              <Label htmlFor="instagram-webhook">Webhook URL</Label>
              <div className="flex gap-2">
                <Input 
                  id="instagram-webhook"
                  value={webhookUrl}
                  readOnly
                  className="font-mono text-xs"
                />
                <Button 
                  variant="outline" 
                  size="icon"
                  onClick={() => copyToClipboard(webhookUrl)}
                >
                  <Copy className="w-4 h-4" />
                </Button>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="instagram-page">Connected Page</Label>
              <Input 
                id="instagram-page"
                placeholder="No page connected"
                disabled
              />
              <p className="text-xs text-muted-foreground">
                Instagram must be connected to a Facebook Page.
              </p>
            </div>

            <Button variant="outline" className="w-full" asChild>
              <a 
                href="https://developers.facebook.com/docs/messenger-platform/instagram" 
                target="_blank" 
                rel="noopener"
              >
                <ExternalLink className="w-4 h-4 mr-2" />
                View Documentation
              </a>
            </Button>
          </CardContent>
        </Card>
      </div>

      {/* Coming Soon Features */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="p-6 border border-dashed border-border rounded-lg"
      >
        <div className="flex items-center gap-3 mb-4">
          <Settings className="w-5 h-5 text-muted-foreground" />
          <h3 className="font-display text-lg text-foreground">Coming Soon</h3>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="p-4 bg-muted/30 rounded-lg">
            <h4 className="font-body text-sm font-medium text-foreground mb-1">Auto-Response Templates</h4>
            <p className="text-xs text-muted-foreground">
              Configure AI-powered auto-replies for common questions
            </p>
          </div>
          <div className="p-4 bg-muted/30 rounded-lg">
            <h4 className="font-body text-sm font-medium text-foreground mb-1">Quick Replies</h4>
            <p className="text-xs text-muted-foreground">
              Set up preset responses for faster communication
            </p>
          </div>
          <div className="p-4 bg-muted/30 rounded-lg">
            <h4 className="font-body text-sm font-medium text-foreground mb-1">Broadcast Messages</h4>
            <p className="text-xs text-muted-foreground">
              Send updates to multiple clients at once
            </p>
          </div>
        </div>
      </motion.div>
    </div>
  );
});

SocialIntegrationSetup.displayName = 'SocialIntegrationSetup';

export default SocialIntegrationSetup;
