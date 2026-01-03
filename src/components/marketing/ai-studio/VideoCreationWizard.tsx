import React, { useState, forwardRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Checkbox } from '@/components/ui/checkbox';
import { ScrollArea } from '@/components/ui/scroll-area';
import { 
  Video, Sparkles, Wand2, Music, Palette, Upload,
  Play, ArrowRight, ArrowLeft, Check, Instagram, 
  Clock, Zap, Brain, Layers, Download, Share2, RefreshCw
} from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';

interface VideoVariant {
  id: string;
  title: string;
  description: string;
  duration: string;
  style: string;
  targetAudience: string;
  predictedViews: string;
  predictedEngagement: number;
  qvoScore: number;
}

const WIZARD_STEPS = [
  { id: 'input', title: 'Script & Idea', icon: Wand2 },
  { id: 'generate', title: 'Generate Video', icon: Video },
  { id: 'edit', title: 'AI Edit', icon: Palette },
  { id: 'multiverse', title: 'Multi-Verse', icon: Layers },
  { id: 'export', title: 'Export', icon: Share2 },
];

const VIDEO_STYLES = [
  { id: 'cinematic', label: 'Cinematic', description: 'High-end production feel' },
  { id: 'trending', label: 'TikTok Trending', description: 'Fast cuts, trending audio' },
  { id: 'calming', label: 'Healing/Calming', description: 'Lo-fi, slow transitions' },
  { id: 'tutorial', label: 'Tutorial Style', description: 'Educational, step-by-step' },
];

export const VideoCreationWizard = forwardRef<HTMLDivElement>((_, ref) => {
  const [currentStep, setCurrentStep] = useState(0);
  const [isGenerating, setIsGenerating] = useState(false);
  const [generationProgress, setGenerationProgress] = useState(0);
  
  // Form state
  const [script, setScript] = useState('');
  const [selectedStyle, setSelectedStyle] = useState('cinematic');
  const [useAvatar, setUseAvatar] = useState(true);
  const [targetPlatforms, setTargetPlatforms] = useState<string[]>(['instagram']);
  const [generatedVariants, setGeneratedVariants] = useState<VideoVariant[]>([]);
  const [selectedVariant, setSelectedVariant] = useState<VideoVariant | null>(null);
  const [editSettings, setEditSettings] = useState({
    colorCorrection: true,
    noiseReduction: true,
    aiTransitions: true,
    trendingMusic: true,
  });

  const generateVideo = async () => {
    setIsGenerating(true);
    setGenerationProgress(0);

    // Simulate generation with progress
    const progressInterval = setInterval(() => {
      setGenerationProgress(prev => {
        if (prev >= 100) {
          clearInterval(progressInterval);
          return 100;
        }
        return prev + 3;
      });
    }, 150);

    try {
      // Generate multi-verse variants
      const variants: VideoVariant[] = [
        {
          id: '1',
          title: 'Universe A - Calming',
          description: 'Optimizado para clientes ansiosos, tono calmado',
          duration: '22s',
          style: 'calming',
          targetAudience: 'First-timers, anxious clients',
          predictedViews: '45K',
          predictedEngagement: 8.2,
          qvoScore: 94
        },
        {
          id: '2',
          title: 'Universe B - Energetic',
          description: 'Fast cuts, trending audio, high energy',
          duration: '18s',
          style: 'trending',
          targetAudience: 'Gen Z, TikTok users',
          predictedViews: '78K',
          predictedEngagement: 12.5,
          qvoScore: 91
        },
        {
          id: '3',
          title: 'Universe C - Educational',
          description: 'Tutorial style, detailed process',
          duration: '32s',
          style: 'tutorial',
          targetAudience: 'Research phase, serious inquiries',
          predictedViews: '32K',
          predictedEngagement: 6.8,
          qvoScore: 88
        },
      ];

      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 5000));
      
      setGeneratedVariants(variants);
      setSelectedVariant(variants[0]);
      setCurrentStep(2); // Move to edit step
      toast.success('Video generado con QVO optimization');
    } catch (err) {
      toast.error('Error generando video');
    } finally {
      setIsGenerating(false);
    }
  };

  const applyAIEdits = async () => {
    setIsGenerating(true);
    setGenerationProgress(0);

    const progressInterval = setInterval(() => {
      setGenerationProgress(prev => {
        if (prev >= 100) {
          clearInterval(progressInterval);
          return 100;
        }
        return prev + 5;
      });
    }, 100);

    await new Promise(resolve => setTimeout(resolve, 2000));
    setIsGenerating(false);
    setCurrentStep(3); // Move to multiverse step
    toast.success('AI edits aplicados con Emu Video');
  };

  const exportVideo = async (platform: string) => {
    toast.success(`Exportando para ${platform}...`);
  };

  const renderStepContent = () => {
    switch (currentStep) {
      case 0: // Input
        return (
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            className="space-y-6"
          >
            <div>
              <Label htmlFor="script" className="text-base font-medium">
                Script / Idea del Video
              </Label>
              <Textarea
                id="script"
                placeholder="Describe tu idea de video... ej: 'Behind-the-scenes de tattoo micro-realismo, mostrando el proceso de healing en 30 días'"
                value={script}
                onChange={(e) => setScript(e.target.value)}
                className="mt-2 min-h-[120px]"
              />
              <div className="flex items-center gap-2 mt-2">
                <Button variant="outline" size="sm">
                  <Sparkles className="w-4 h-4 mr-2" />
                  AI Suggest
                </Button>
                <Button variant="outline" size="sm">
                  <Upload className="w-4 h-4 mr-2" />
                  Upload Reference
                </Button>
              </div>
            </div>

            <div>
              <Label className="text-base font-medium">Estilo de Video</Label>
              <RadioGroup
                value={selectedStyle}
                onValueChange={setSelectedStyle}
                className="grid grid-cols-2 gap-4 mt-2"
              >
                {VIDEO_STYLES.map(style => (
                  <div key={style.id} className="relative">
                    <RadioGroupItem
                      value={style.id}
                      id={style.id}
                      className="peer sr-only"
                    />
                    <Label
                      htmlFor={style.id}
                      className="flex flex-col items-start gap-1 rounded-lg border-2 border-muted bg-popover p-4 hover:bg-accent hover:text-accent-foreground peer-data-[state=checked]:border-primary [&:has([data-state=checked])]:border-primary cursor-pointer"
                    >
                      <span className="font-medium">{style.label}</span>
                      <span className="text-sm text-muted-foreground">{style.description}</span>
                    </Label>
                  </div>
                ))}
              </RadioGroup>
            </div>

            <div className="flex items-center space-x-2">
              <Checkbox 
                id="useAvatar" 
                checked={useAvatar}
                onCheckedChange={(checked) => setUseAvatar(checked as boolean)}
              />
              <Label htmlFor="useAvatar">Usar Avatar AI para narración</Label>
            </div>

            <div>
              <Label className="text-base font-medium">Plataformas Target</Label>
              <div className="flex gap-2 mt-2">
                {['instagram', 'tiktok', 'youtube'].map(platform => (
                  <Button
                    key={platform}
                    variant={targetPlatforms.includes(platform) ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => {
                      if (targetPlatforms.includes(platform)) {
                        setTargetPlatforms(targetPlatforms.filter(p => p !== platform));
                      } else {
                        setTargetPlatforms([...targetPlatforms, platform]);
                      }
                    }}
                  >
                    {platform.charAt(0).toUpperCase() + platform.slice(1)}
                  </Button>
                ))}
              </div>
            </div>
          </motion.div>
        );

      case 1: // Generate
        return (
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            className="space-y-6"
          >
            <Card className="bg-gradient-to-br from-primary/10 to-primary/5">
              <CardContent className="pt-6">
                <div className="text-center space-y-4">
                  <div className="flex items-center justify-center">
                    <div className="w-20 h-20 rounded-full bg-primary/20 flex items-center justify-center">
                      <Video className="w-10 h-10 text-primary" />
                    </div>
                  </div>
                  <div>
                    <h3 className="text-xl font-bold">Meta Mango 2026 Text-to-Video</h3>
                    <p className="text-muted-foreground">
                      Generación con QVO (Quantum Video Optimization)
                    </p>
                  </div>
                  {isGenerating ? (
                    <div className="space-y-2">
                      <Progress value={generationProgress} className="h-2" />
                      <p className="text-sm text-muted-foreground">
                        {generationProgress < 30 && 'Analizando script...'}
                        {generationProgress >= 30 && generationProgress < 60 && 'Generando frames con QNN...'}
                        {generationProgress >= 60 && generationProgress < 90 && 'Optimizando con QAOA...'}
                        {generationProgress >= 90 && 'Finalizando multi-verse variants...'}
                      </p>
                    </div>
                  ) : (
                    <Button onClick={generateVideo} size="lg" className="gap-2">
                      <Sparkles className="w-5 h-5" />
                      Generar Video
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* QVO Features */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <Card className="bg-muted/50">
                <CardContent className="pt-4">
                  <div className="flex items-center gap-2 mb-2">
                    <Zap className="w-4 h-4 text-yellow-500" />
                    <span className="font-medium">QNN Optimization</span>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    Infinite variant edits, max quality min time
                  </p>
                </CardContent>
              </Card>
              <Card className="bg-muted/50">
                <CardContent className="pt-4">
                  <div className="flex items-center gap-2 mb-2">
                    <Layers className="w-4 h-4 text-purple-500" />
                    <span className="font-medium">Multi-Verse Gen</span>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    World models for infinite series
                  </p>
                </CardContent>
              </Card>
              <Card className="bg-muted/50">
                <CardContent className="pt-4">
                  <div className="flex items-center gap-2 mb-2">
                    <Brain className="w-4 h-4 text-primary" />
                    <span className="font-medium">Causal Selection</span>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    QAOA selects best for max revenue
                  </p>
                </CardContent>
              </Card>
            </div>
          </motion.div>
        );

      case 2: // Edit
        return (
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            className="space-y-6"
          >
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Palette className="w-5 h-5 text-primary" />
                  AI Auto-Edit (Emu Video / Movie Gen)
                </CardTitle>
                <CardDescription>
                  Color correction, noise reduction, AI transitions, trending music
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  {Object.entries(editSettings).map(([key, value]) => (
                    <div key={key} className="flex items-center space-x-2">
                      <Checkbox
                        id={key}
                        checked={value}
                        onCheckedChange={(checked) => 
                          setEditSettings({ ...editSettings, [key]: checked as boolean })
                        }
                      />
                      <Label htmlFor={key} className="capitalize">
                        {key.replace(/([A-Z])/g, ' $1').trim()}
                      </Label>
                    </div>
                  ))}
                </div>

                {/* Preview Area */}
                <Card className="bg-muted/50 aspect-video flex items-center justify-center">
                  <div className="text-center">
                    <Play className="w-12 h-12 text-muted-foreground mx-auto mb-2" />
                    <p className="text-muted-foreground">Video Preview</p>
                  </div>
                </Card>

                {isGenerating ? (
                  <div className="space-y-2">
                    <Progress value={generationProgress} className="h-2" />
                    <p className="text-sm text-muted-foreground text-center">
                      Aplicando AI edits...
                    </p>
                  </div>
                ) : (
                  <Button onClick={applyAIEdits} className="w-full">
                    <Wand2 className="w-4 h-4 mr-2" />
                    Apply AI Edits
                  </Button>
                )}
              </CardContent>
            </Card>

            {/* CapCut AI Integration */}
            <Card className="border-primary/30">
              <CardContent className="pt-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Music className="w-5 h-5 text-primary" />
                    <div>
                      <p className="font-medium">CapCut AI 2026</p>
                      <p className="text-sm text-muted-foreground">
                        Auto effects/music, direct TikTok upload
                      </p>
                    </div>
                  </div>
                  <Button variant="outline" size="sm">
                    Connect
                  </Button>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        );

      case 3: // Multi-Verse
        return (
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            className="space-y-6"
          >
            <Card className="bg-gradient-to-br from-purple-500/10 to-purple-500/5 border-purple-500/30">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Layers className="w-5 h-5 text-purple-500" />
                  Multi-Verse Video Variants
                </CardTitle>
                <CardDescription>
                  MoR + World Models: infinite variants optimized by QAOA
                </CardDescription>
              </CardHeader>
            </Card>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {generatedVariants.map((variant) => (
                <Card
                  key={variant.id}
                  className={`cursor-pointer transition-all hover:border-primary/50 ${
                    selectedVariant?.id === variant.id ? 'border-primary ring-2 ring-primary/20' : ''
                  }`}
                  onClick={() => setSelectedVariant(variant)}
                >
                  <CardHeader className="pb-2">
                    <div className="flex items-center justify-between">
                      <Badge variant="secondary">{variant.style}</Badge>
                      <div className="text-right">
                        <p className="text-lg font-bold">{variant.qvoScore}</p>
                        <p className="text-xs text-muted-foreground">QVO Score</p>
                      </div>
                    </div>
                    <CardTitle className="text-sm">{variant.title}</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-xs text-muted-foreground mb-3">{variant.description}</p>
                    
                    <div className="space-y-2 text-sm">
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Duration</span>
                        <span>{variant.duration}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Est. Views</span>
                        <span>{variant.predictedViews}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Engagement</span>
                        <span className="text-green-500">{variant.predictedEngagement}%</span>
                      </div>
                    </div>

                    <Card className="mt-3 bg-muted/50">
                      <CardContent className="pt-2 pb-2">
                        <p className="text-xs text-muted-foreground">Target Audience</p>
                        <p className="text-xs">{variant.targetAudience}</p>
                      </CardContent>
                    </Card>

                    {selectedVariant?.id === variant.id && (
                      <div className="mt-3 flex items-center justify-center">
                        <Check className="w-5 h-5 text-primary" />
                      </div>
                    )}
                  </CardContent>
                </Card>
              ))}
            </div>

            <Button 
              variant="outline" 
              className="w-full"
              onClick={() => toast.info('Generando más universos...')}
            >
              <RefreshCw className="w-4 h-4 mr-2" />
              Generate More Universes
            </Button>
          </motion.div>
        );

      case 4: // Export
        return (
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            className="space-y-6"
          >
            <Card className="bg-gradient-to-br from-green-500/10 to-green-500/5 border-green-500/30">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Check className="w-5 h-5 text-green-500" />
                  Video Listo para Exportar
                </CardTitle>
                <CardDescription>
                  Selecciona plataformas para export directo
                </CardDescription>
              </CardHeader>
              <CardContent>
                {selectedVariant && (
                  <Card className="bg-muted/50 mb-4">
                    <CardContent className="pt-4">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="font-medium">{selectedVariant.title}</p>
                          <p className="text-sm text-muted-foreground">{selectedVariant.duration}</p>
                        </div>
                        <Badge className="bg-green-500/20 text-green-500">
                          QVO: {selectedVariant.qvoScore}
                        </Badge>
                      </div>
                    </CardContent>
                  </Card>
                )}

                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <Button 
                    className="h-auto py-4 flex-col gap-2" 
                    variant="outline"
                    onClick={() => exportVideo('Instagram')}
                  >
                    <Instagram className="w-6 h-6" />
                    <span>Instagram</span>
                  </Button>
                  <Button 
                    className="h-auto py-4 flex-col gap-2" 
                    variant="outline"
                    onClick={() => exportVideo('TikTok')}
                  >
                    <Video className="w-6 h-6" />
                    <span>TikTok</span>
                  </Button>
                  <Button 
                    className="h-auto py-4 flex-col gap-2" 
                    variant="outline"
                    onClick={() => exportVideo('YouTube')}
                  >
                    <Play className="w-6 h-6" />
                    <span>YouTube</span>
                  </Button>
                  <Button 
                    className="h-auto py-4 flex-col gap-2" 
                    variant="outline"
                    onClick={() => exportVideo('Download')}
                  >
                    <Download className="w-6 h-6" />
                    <span>Download</span>
                  </Button>
                </div>
              </CardContent>
            </Card>

            {/* Series Generation */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Layers className="w-5 h-5 text-primary" />
                  Serialized Multi-Verse Gen
                </CardTitle>
                <CardDescription>
                  Crea series infinitas con world models eternos
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Button variant="outline" className="w-full">
                  <Sparkles className="w-4 h-4 mr-2" />
                  Generate Episode Series (Healing Journey)
                </Button>
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
        {/* Progress line */}
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
          disabled={currentStep === WIZARD_STEPS.length - 1 || (currentStep === 0 && !script)}
        >
          Siguiente
          <ArrowRight className="w-4 h-4 ml-2" />
        </Button>
      </div>
    </div>
  );
});

VideoCreationWizard.displayName = "VideoCreationWizard";
