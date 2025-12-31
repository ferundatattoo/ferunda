import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { 
  Instagram, Youtube, Globe, Check, ArrowRight, ArrowLeft,
  Zap, Brain, Link, Settings, Video, RefreshCw, Play,
  MessageSquare, Mail, BarChart3
} from 'lucide-react';
import { toast } from 'sonner';

interface Platform {
  id: string;
  name: string;
  icon: React.ReactNode;
  connected: boolean;
  features: string[];
  status: 'disconnected' | 'connecting' | 'connected' | 'error';
  syncStatus?: string;
  lastSync?: string;
}

const WIZARD_STEPS = [
  { id: 'select', title: 'Seleccionar Plataformas', icon: Globe },
  { id: 'auth', title: 'Autenticar', icon: Link },
  { id: 'configure', title: 'Configurar', icon: Settings },
  { id: 'test', title: 'Test Conexión', icon: Play },
];

export function PlatformConnectionWizard() {
  const [currentStep, setCurrentStep] = useState(0);
  const [isConnecting, setIsConnecting] = useState(false);
  const [connectionProgress, setConnectionProgress] = useState(0);
  
  const [platforms, setPlatforms] = useState<Platform[]>([
    {
      id: 'instagram',
      name: 'Instagram',
      icon: <Instagram className="w-6 h-6" />,
      connected: false,
      features: ['Reels', 'Stories', 'Posts', 'DM Inbox', 'Analytics'],
      status: 'disconnected'
    },
    {
      id: 'tiktok',
      name: 'TikTok',
      icon: <Video className="w-6 h-6" />,
      connected: false,
      features: ['Video Upload', 'Analytics', 'Comments', 'Trending Audio'],
      status: 'disconnected'
    },
    {
      id: 'youtube',
      name: 'YouTube',
      icon: <Youtube className="w-6 h-6" />,
      connected: false,
      features: ['Shorts', 'Videos', 'Analytics', 'Comments'],
      status: 'disconnected'
    },
    {
      id: 'facebook',
      name: 'Facebook',
      icon: <Globe className="w-6 h-6" />,
      connected: false,
      features: ['Page Posts', 'Reels', 'Messenger', 'Ads Manager'],
      status: 'disconnected'
    },
    {
      id: 'x',
      name: 'X (Twitter)',
      icon: <MessageSquare className="w-6 h-6" />,
      connected: false,
      features: ['Posts', 'DMs', 'Analytics', 'Spaces'],
      status: 'disconnected'
    },
    {
      id: 'googleads',
      name: 'Google Ads',
      icon: <BarChart3 className="w-6 h-6" />,
      connected: false,
      features: ['Campaign Management', 'Analytics', 'Audience Sync'],
      status: 'disconnected'
    },
  ]);

  const [selectedPlatforms, setSelectedPlatforms] = useState<string[]>([]);
  const [webhookSettings, setWebhookSettings] = useState({
    dmNotifications: true,
    commentNotifications: true,
    mentionNotifications: true,
    autoRespond: false,
  });

  const togglePlatform = (platformId: string) => {
    if (selectedPlatforms.includes(platformId)) {
      setSelectedPlatforms(selectedPlatforms.filter(p => p !== platformId));
    } else {
      setSelectedPlatforms([...selectedPlatforms, platformId]);
    }
  };

  const connectPlatforms = async () => {
    setIsConnecting(true);
    setConnectionProgress(0);

    const progressInterval = setInterval(() => {
      setConnectionProgress(prev => {
        if (prev >= 100) {
          clearInterval(progressInterval);
          return 100;
        }
        return prev + 5;
      });
    }, 150);

    // Simulate OAuth flow for each platform
    for (const platformId of selectedPlatforms) {
      await new Promise(resolve => setTimeout(resolve, 1000));
      setPlatforms(prev => prev.map(p => 
        p.id === platformId ? { ...p, status: 'connecting' as const } : p
      ));
      await new Promise(resolve => setTimeout(resolve, 500));
      setPlatforms(prev => prev.map(p => 
        p.id === platformId ? { ...p, status: 'connected' as const, connected: true } : p
      ));
    }

    setIsConnecting(false);
    setCurrentStep(2); // Move to configure step
    toast.success('Plataformas conectadas con Agentic AI');
  };

  const runConnectionTest = async () => {
    setIsConnecting(true);
    
    // Simulate test video generation and posting
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    setPlatforms(prev => prev.map(p => 
      p.connected ? { 
        ...p, 
        syncStatus: 'Test video posted successfully',
        lastSync: 'Just now'
      } : p
    ));
    
    setIsConnecting(false);
    toast.success('Test completado - Avatar video posted a todas las plataformas');
  };

  const renderStepContent = () => {
    switch (currentStep) {
      case 0: // Select Platforms
        return (
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            className="space-y-6"
          >
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {platforms.map((platform) => (
                <Card
                  key={platform.id}
                  className={`cursor-pointer transition-all hover:border-primary/50 ${
                    selectedPlatforms.includes(platform.id) ? 'border-primary ring-2 ring-primary/20' : ''
                  }`}
                  onClick={() => togglePlatform(platform.id)}
                >
                  <CardHeader className="pb-2">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        {platform.icon}
                        <CardTitle className="text-base">{platform.name}</CardTitle>
                      </div>
                      {selectedPlatforms.includes(platform.id) && (
                        <Check className="w-5 h-5 text-primary" />
                      )}
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="flex flex-wrap gap-1">
                      {platform.features.slice(0, 3).map(feature => (
                        <Badge key={feature} variant="secondary" className="text-xs">
                          {feature}
                        </Badge>
                      ))}
                      {platform.features.length > 3 && (
                        <Badge variant="outline" className="text-xs">
                          +{platform.features.length - 3}
                        </Badge>
                      )}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>

            {/* Agentic AI Feature */}
            <Card className="bg-gradient-to-br from-purple-500/10 to-purple-500/5 border-purple-500/30">
              <CardContent className="pt-4">
                <div className="flex items-center gap-3">
                  <Brain className="w-6 h-6 text-purple-500" />
                  <div>
                    <p className="font-medium">Autonomous Agentic Setup</p>
                    <p className="text-sm text-muted-foreground">
                      Agents god-mode: auto-negocian auth, optimizan integraciones con QAOA
                    </p>
                  </div>
                  <Badge variant="secondary" className="ml-auto text-purple-500">
                    AI Active
                  </Badge>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        );

      case 1: // Authenticate
        return (
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            className="space-y-6"
          >
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Link className="w-5 h-5 text-primary" />
                  OAuth Eternal Authentication
                </CardTitle>
                <CardDescription>
                  Agentic AI configurará automáticamente auth y webhooks
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {selectedPlatforms.map(platformId => {
                  const platform = platforms.find(p => p.id === platformId);
                  if (!platform) return null;

                  return (
                    <Card key={platformId} className="bg-muted/50">
                      <CardContent className="pt-4">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            {platform.icon}
                            <div>
                              <p className="font-medium">{platform.name}</p>
                              <p className="text-sm text-muted-foreground">
                                {platform.status === 'connected' && 'Connected'}
                                {platform.status === 'connecting' && 'Connecting...'}
                                {platform.status === 'disconnected' && 'Ready to connect'}
                              </p>
                            </div>
                          </div>
                          {platform.status === 'connected' ? (
                            <Check className="w-5 h-5 text-green-500" />
                          ) : platform.status === 'connecting' ? (
                            <RefreshCw className="w-5 h-5 text-primary animate-spin" />
                          ) : (
                            <Badge variant="outline">Pending</Badge>
                          )}
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}

                {isConnecting && (
                  <div className="space-y-2">
                    <Progress value={connectionProgress} className="h-2" />
                    <p className="text-sm text-muted-foreground text-center">
                      Agentic AI configurando OAuth y webhooks... {connectionProgress}%
                    </p>
                  </div>
                )}

                {!isConnecting && (
                  <Button onClick={connectPlatforms} className="w-full" size="lg">
                    <Zap className="w-4 h-4 mr-2" />
                    Connect All with Agentic AI
                  </Button>
                )}
              </CardContent>
            </Card>

            {/* Cross-Platform Fusion Learning */}
            <Card className="border-cyan-500/30">
              <CardContent className="pt-4">
                <div className="flex items-center gap-3">
                  <Globe className="w-5 h-5 text-cyan-500" />
                  <div>
                    <p className="font-medium">Cross-Platform Fusion Learning</p>
                    <p className="text-sm text-muted-foreground">
                      Federated learning: aprende from all platforms para unified marketing
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        );

      case 2: // Configure
        return (
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            className="space-y-6"
          >
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Settings className="w-5 h-5 text-primary" />
                  Webhook & Notification Settings
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {Object.entries(webhookSettings).map(([key, value]) => (
                    <div key={key} className="flex items-center space-x-2 p-3 rounded-lg bg-muted/50">
                      <Checkbox
                        id={key}
                        checked={value}
                        onCheckedChange={(checked) =>
                          setWebhookSettings({ ...webhookSettings, [key]: checked as boolean })
                        }
                      />
                      <Label htmlFor={key} className="flex-1 capitalize">
                        {key.replace(/([A-Z])/g, ' $1').trim()}
                      </Label>
                    </div>
                  ))}
                </div>

                {/* Meta Mango Integration */}
                <Card className="bg-gradient-to-br from-primary/10 to-primary/5">
                  <CardContent className="pt-4">
                    <div className="flex items-center gap-3 mb-3">
                      <Video className="w-5 h-5 text-primary" />
                      <p className="font-medium">Meta Mango 2026 Integration</p>
                    </div>
                    <p className="text-sm text-muted-foreground mb-3">
                      Auto-transitions AI para IG video edits + CapCut AI para TikTok
                    </p>
                    <div className="flex gap-2">
                      <Badge variant="secondary">Auto Color Grading</Badge>
                      <Badge variant="secondary">Trending Audio Sync</Badge>
                      <Badge variant="secondary">AI Captions</Badge>
                    </div>
                  </CardContent>
                </Card>
              </CardContent>
            </Card>

            {/* Connected Platforms Status */}
            <Card>
              <CardHeader>
                <CardTitle>Connected Platforms</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                  {platforms.filter(p => p.connected).map(platform => (
                    <Card key={platform.id} className="bg-green-500/10 border-green-500/30">
                      <CardContent className="pt-4">
                        <div className="flex items-center gap-2 mb-2">
                          {platform.icon}
                          <span className="font-medium">{platform.name}</span>
                        </div>
                        <Badge className="bg-green-500/20 text-green-500">
                          <Check className="w-3 h-3 mr-1" />
                          Connected
                        </Badge>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </CardContent>
            </Card>
          </motion.div>
        );

      case 3: // Test
        return (
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            className="space-y-6"
          >
            <Card className="bg-gradient-to-br from-green-500/10 to-green-500/5 border-green-500/30">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Play className="w-5 h-5 text-green-500" />
                  Test Conexión con Avatar Video
                </CardTitle>
                <CardDescription>
                  Genera y posta un video test con tu avatar a todas las plataformas
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="text-center space-y-4">
                  <div className="w-24 h-24 mx-auto rounded-full bg-primary/20 flex items-center justify-center">
                    <Video className="w-12 h-12 text-primary" />
                  </div>
                  
                  {isConnecting ? (
                    <div className="space-y-2">
                      <RefreshCw className="w-6 h-6 animate-spin mx-auto text-primary" />
                      <p className="text-muted-foreground">
                        Generando avatar video test y posteando...
                      </p>
                    </div>
                  ) : (
                    <Button onClick={runConnectionTest} size="lg">
                      <Video className="w-4 h-4 mr-2" />
                      Run Connection Test
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Test Results */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {platforms.filter(p => p.connected).map(platform => (
                <Card key={platform.id}>
                  <CardContent className="pt-4">
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-2">
                        {platform.icon}
                        <span className="font-medium">{platform.name}</span>
                      </div>
                      {platform.syncStatus ? (
                        <Badge className="bg-green-500/20 text-green-500">
                          <Check className="w-3 h-3 mr-1" />
                          Success
                        </Badge>
                      ) : (
                        <Badge variant="outline">Pending</Badge>
                      )}
                    </div>
                    {platform.syncStatus && (
                      <div className="text-sm">
                        <p className="text-muted-foreground">{platform.syncStatus}</p>
                        <p className="text-xs text-muted-foreground mt-1">
                          Last sync: {platform.lastSync}
                        </p>
                      </div>
                    )}
                  </CardContent>
                </Card>
              ))}
            </div>

            {/* Holographic Sync Preview */}
            <Card className="border-purple-500/30">
              <CardContent className="pt-4">
                <div className="flex items-center gap-3">
                  <Globe className="w-5 h-5 text-purple-500" />
                  <div>
                    <p className="font-medium">Holographic Sync (WebXR)</p>
                    <p className="text-sm text-muted-foreground">
                      Preview conexiones in AR eternal - Coming Soon
                    </p>
                  </div>
                  <Badge variant="secondary" className="ml-auto">Beta</Badge>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        );

      default:
        return null;
    }
  };

  return (
    <div className="space-y-6">
      {/* Progress Steps */}
      <div className="flex items-center justify-between relative">
        {WIZARD_STEPS.map((step, index) => {
          const StepIcon = step.icon;
          const isActive = index === currentStep;
          const isCompleted = index < currentStep;

          return (
            <div
              key={step.id}
              className="flex flex-col items-center gap-2 z-10"
            >
              <div
                className={`w-10 h-10 rounded-full flex items-center justify-center transition-all ${
                  isActive ? 'bg-primary text-primary-foreground' :
                  isCompleted ? 'bg-green-500 text-white' :
                  'bg-muted text-muted-foreground'
                }`}
              >
                {isCompleted ? <Check className="w-5 h-5" /> : <StepIcon className="w-5 h-5" />}
              </div>
              <span className={`text-xs ${isActive ? 'text-primary font-medium' : 'text-muted-foreground'}`}>
                {step.title}
              </span>
            </div>
          );
        })}
        <div className="absolute top-5 left-0 right-0 h-0.5 bg-muted -z-0">
          <div
            className="h-full bg-primary transition-all"
            style={{ width: `${(currentStep / (WIZARD_STEPS.length - 1)) * 100}%` }}
          />
        </div>
      </div>

      {/* Step Content */}
      <AnimatePresence mode="wait">
        {renderStepContent()}
      </AnimatePresence>

      {/* Navigation */}
      <div className="flex items-center justify-between pt-4">
        <Button
          variant="outline"
          onClick={() => setCurrentStep(Math.max(0, currentStep - 1))}
          disabled={currentStep === 0}
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          Anterior
        </Button>
        <Button
          onClick={() => setCurrentStep(Math.min(WIZARD_STEPS.length - 1, currentStep + 1))}
          disabled={currentStep === WIZARD_STEPS.length - 1 || (currentStep === 0 && selectedPlatforms.length === 0)}
        >
          Siguiente
          <ArrowRight className="w-4 h-4 ml-2" />
        </Button>
      </div>
    </div>
  );
}
