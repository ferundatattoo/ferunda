import { useState } from 'react';
import { motion } from 'framer-motion';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Progress } from '@/components/ui/progress';
import { 
  Sparkles, Wand2, Mail, Target, Image, 
  Loader2, Copy, Check, Zap, Brain, 
  Scissors, RefreshCw, TrendingUp
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface GenerationResult {
  content: string;
  model: string;
  timestamp: Date;
}

export function AIMarketingLab() {
  const [activeTab, setActiveTab] = useState('copy');
  const [loading, setLoading] = useState(false);
  const [prompt, setPrompt] = useState('');
  const [language, setLanguage] = useState('es');
  const [result, setResult] = useState<GenerationResult | null>(null);
  const [copied, setCopied] = useState(false);
  
  // Image comparison states
  const [imageUrl1, setImageUrl1] = useState('');
  const [imageUrl2, setImageUrl2] = useState('');
  const [comparisonResult, setComparisonResult] = useState<any>(null);
  
  // Extractor states
  const [extractorUrl, setExtractorUrl] = useState('');
  const [extractorResult, setExtractorResult] = useState<any>(null);
  const [generatedImage, setGeneratedImage] = useState<string | null>(null);

  const callMarketingStudio = async (action: string, payload: any) => {
    const { data, error } = await supabase.functions.invoke('ai-marketing-studio', {
      body: { action, ...payload }
    });
    
    if (error) throw error;
    if (!data.success) throw new Error(data.error);
    return data;
  };

  const callTattooExtractor = async (action: string, payload: any) => {
    const { data, error } = await supabase.functions.invoke('tattoo-extractor', {
      body: { action, ...payload }
    });
    
    if (error) throw error;
    if (!data.success) throw new Error(data.error);
    return data;
  };

  const handleGenerateCopy = async () => {
    if (!prompt.trim()) {
      toast.error('Ingresa una descripción para generar el copy');
      return;
    }

    setLoading(true);
    try {
      const data = await callMarketingStudio('generate_copy', { prompt, language });
      setResult({
        content: data.copy,
        model: data.model,
        timestamp: new Date()
      });
      toast.success('Copy generado con Mistral AI');
    } catch (error: any) {
      toast.error(error.message || 'Error generando copy');
    } finally {
      setLoading(false);
    }
  };

  const handleGenerateStrategy = async () => {
    if (!prompt.trim()) {
      toast.error('Ingresa un brief para la estrategia');
      return;
    }

    setLoading(true);
    try {
      const data = await callMarketingStudio('generate_strategy', { prompt });
      setResult({
        content: data.strategy,
        model: data.model,
        timestamp: new Date()
      });
      toast.success('Estrategia generada con DeepSeek AI');
    } catch (error: any) {
      toast.error(error.message || 'Error generando estrategia');
    } finally {
      setLoading(false);
    }
  };

  const handleGenerateEmail = async () => {
    if (!prompt.trim()) {
      toast.error('Ingresa el contexto del email');
      return;
    }

    setLoading(true);
    try {
      const data = await callMarketingStudio('generate_email', { prompt, language });
      setResult({
        content: data.email,
        model: data.model,
        timestamp: new Date()
      });
      toast.success('Email generado con Qwen AI');
    } catch (error: any) {
      toast.error(error.message || 'Error generando email');
    } finally {
      setLoading(false);
    }
  };

  const handleCompareDesigns = async () => {
    if (!imageUrl1.trim() || !imageUrl2.trim()) {
      toast.error('Ingresa ambas URLs de imagen');
      return;
    }

    setLoading(true);
    try {
      const data = await callMarketingStudio('compare_designs', { imageUrl1, imageUrl2 });
      setComparisonResult(data);
      toast.success('Comparación realizada con CLIP');
    } catch (error: any) {
      toast.error(error.message || 'Error comparando diseños');
    } finally {
      setLoading(false);
    }
  };

  const handleGenerateImage = async () => {
    if (!prompt.trim()) {
      toast.error('Ingresa una descripción para la imagen');
      return;
    }

    setLoading(true);
    try {
      const data = await callMarketingStudio('generate_image', { prompt, style: 'promotional' });
      setGeneratedImage(data.image);
      toast.success('Imagen generada con FLUX');
    } catch (error: any) {
      toast.error(error.message || 'Error generando imagen');
    } finally {
      setLoading(false);
    }
  };

  const handleExtractTattoo = async () => {
    if (!extractorUrl.trim()) {
      toast.error('Ingresa la URL de la imagen');
      return;
    }

    setLoading(true);
    try {
      const data = await callTattooExtractor('extract', { imageUrl: extractorUrl });
      setExtractorResult(data);
      toast.success('Extracción completada con SAM');
    } catch (error: any) {
      toast.error(error.message || 'Error extrayendo tatuaje');
    } finally {
      setLoading(false);
    }
  };

  const handleGenerateVariation = async () => {
    if (!extractorUrl.trim()) {
      toast.error('Ingresa la URL de la imagen de referencia');
      return;
    }

    setLoading(true);
    try {
      const data = await callTattooExtractor('generate_variation', { 
        imageUrl: extractorUrl,
        prompt: prompt || 'elegant tattoo variation'
      });
      setExtractorResult(data);
      setGeneratedImage(data.variationImage);
      toast.success('Variación generada con FLUX');
    } catch (error: any) {
      toast.error(error.message || 'Error generando variación');
    } finally {
      setLoading(false);
    }
  };

  const copyToClipboard = () => {
    if (result?.content) {
      navigator.clipboard.writeText(result.content);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
      toast.success('Copiado al portapapeles');
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold flex items-center gap-2">
            <Brain className="w-6 h-6 text-primary" />
            AI Marketing Lab
          </h2>
          <p className="text-muted-foreground">
            Modelos Open-Source: Mistral, DeepSeek, Qwen, CLIP, FLUX
          </p>
        </div>
        <Badge variant="outline" className="bg-primary/10">
          <Zap className="w-3 h-3 mr-1" />
          Hugging Face Powered
        </Badge>
      </div>

      {/* Model Status */}
      <div className="grid grid-cols-5 gap-2">
        {[
          { name: 'Mistral', use: 'Copy', color: 'bg-blue-500' },
          { name: 'DeepSeek', use: 'Strategy', color: 'bg-purple-500' },
          { name: 'Qwen', use: 'Email', color: 'bg-green-500' },
          { name: 'CLIP', use: 'Compare', color: 'bg-orange-500' },
          { name: 'FLUX', use: 'Images', color: 'bg-pink-500' },
        ].map((model) => (
          <div key={model.name} className="flex items-center gap-2 p-2 rounded-lg border bg-card">
            <div className={`w-2 h-2 rounded-full ${model.color}`} />
            <div className="text-xs">
              <div className="font-medium">{model.name}</div>
              <div className="text-muted-foreground">{model.use}</div>
            </div>
          </div>
        ))}
      </div>

      {/* Main Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid grid-cols-5 w-full">
          <TabsTrigger value="copy" className="flex items-center gap-1">
            <Sparkles className="w-4 h-4" />
            Copy Viral
          </TabsTrigger>
          <TabsTrigger value="strategy" className="flex items-center gap-1">
            <Target className="w-4 h-4" />
            Estrategia
          </TabsTrigger>
          <TabsTrigger value="email" className="flex items-center gap-1">
            <Mail className="w-4 h-4" />
            Email
          </TabsTrigger>
          <TabsTrigger value="compare" className="flex items-center gap-1">
            <TrendingUp className="w-4 h-4" />
            Comparar
          </TabsTrigger>
          <TabsTrigger value="extractor" className="flex items-center gap-1">
            <Scissors className="w-4 h-4" />
            Extractor
          </TabsTrigger>
        </TabsList>

        {/* Copy Generation */}
        <TabsContent value="copy" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Wand2 className="w-5 h-5" />
                Generador de Copy Viral
              </CardTitle>
              <CardDescription>
                Usa Mistral 7B para crear posts virales para Instagram/TikTok
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex gap-2">
                <Select value={language} onValueChange={setLanguage}>
                  <SelectTrigger className="w-32">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="es">Español</SelectItem>
                    <SelectItem value="en">English</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <Textarea
                placeholder="Describe el tatuaje o servicio a promocionar... Ej: Full sleeve micro-realismo con flores para piel oscura"
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                rows={3}
              />
              <Button onClick={handleGenerateCopy} disabled={loading}>
                {loading ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Sparkles className="w-4 h-4 mr-2" />}
                Generar Copy
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Strategy Generation */}
        <TabsContent value="strategy" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Target className="w-5 h-5" />
                Estrategia de Campaña
              </CardTitle>
              <CardDescription>
                Usa DeepSeek para crear estrategias de marketing completas
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <Textarea
                placeholder="Describe tu objetivo de campaña... Ej: Promocionar full sleeves geométricos para piel oscura, aumentar bookings 30%"
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                rows={3}
              />
              <Button onClick={handleGenerateStrategy} disabled={loading}>
                {loading ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Target className="w-4 h-4 mr-2" />}
                Generar Estrategia
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Email Generation */}
        <TabsContent value="email" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Mail className="w-5 h-5" />
                Email Personalizado
              </CardTitle>
              <CardDescription>
                Usa Qwen para crear emails de upsell y seguimiento
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex gap-2">
                <Select value={language} onValueChange={setLanguage}>
                  <SelectTrigger className="w-32">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="es">Español</SelectItem>
                    <SelectItem value="en">English</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <Textarea
                placeholder="Contexto del email... Ej: Cliente completó full sleeve de flores, ofrecer color accent por $150 adicional"
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                rows={3}
              />
              <Button onClick={handleGenerateEmail} disabled={loading}>
                {loading ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Mail className="w-4 h-4 mr-2" />}
                Generar Email
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Design Comparison */}
        <TabsContent value="compare" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <TrendingUp className="w-5 h-5" />
                Comparador de Diseños
              </CardTitle>
              <CardDescription>
                Usa CLIP para comparar similitud entre diseños
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium">Diseño 1 (URL)</label>
                  <Input
                    placeholder="https://..."
                    value={imageUrl1}
                    onChange={(e) => setImageUrl1(e.target.value)}
                  />
                </div>
                <div>
                  <label className="text-sm font-medium">Diseño 2 (URL)</label>
                  <Input
                    placeholder="https://..."
                    value={imageUrl2}
                    onChange={(e) => setImageUrl2(e.target.value)}
                  />
                </div>
              </div>
              <Button onClick={handleCompareDesigns} disabled={loading}>
                {loading ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <TrendingUp className="w-4 h-4 mr-2" />}
                Comparar Diseños
              </Button>

              {comparisonResult && (
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="p-4 rounded-lg border bg-card space-y-3"
                >
                  <div className="flex items-center justify-between">
                    <span className="font-medium">Similitud</span>
                    <Badge variant={comparisonResult.similarity > 0.7 ? "default" : "secondary"}>
                      {(comparisonResult.similarity * 100).toFixed(1)}%
                    </Badge>
                  </div>
                  <Progress value={comparisonResult.similarity * 100} />
                  <p className="text-sm text-muted-foreground">{comparisonResult.analysis}</p>
                </motion.div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Tattoo Extractor */}
        <TabsContent value="extractor" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Scissors className="w-5 h-5" />
                Extractor de Tatuajes
              </CardTitle>
              <CardDescription>
                Usa SAM para segmentar y FLUX para generar variaciones
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <label className="text-sm font-medium">URL de imagen con tatuaje</label>
                <Input
                  placeholder="https://..."
                  value={extractorUrl}
                  onChange={(e) => setExtractorUrl(e.target.value)}
                />
              </div>
              <Textarea
                placeholder="Descripción para variación (opcional)..."
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                rows={2}
              />
              <div className="flex gap-2">
                <Button onClick={handleExtractTattoo} disabled={loading} variant="outline">
                  {loading ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Scissors className="w-4 h-4 mr-2" />}
                  Extraer Tatuaje
                </Button>
                <Button onClick={handleGenerateVariation} disabled={loading}>
                  {loading ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <RefreshCw className="w-4 h-4 mr-2" />}
                  Generar Variación
                </Button>
              </div>

              {extractorResult && (
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="p-4 rounded-lg border bg-card space-y-3"
                >
                  {extractorResult.qnnOptimized && (
                    <Badge variant="outline" className="bg-purple-500/10">
                      <Brain className="w-3 h-3 mr-1" />
                      QNN Optimizado
                    </Badge>
                  )}
                  {extractorResult.segmentCount !== undefined && (
                    <p className="text-sm">Segmentos detectados: {extractorResult.segmentCount}</p>
                  )}
                  {extractorResult.recommendation && (
                    <p className="text-sm text-muted-foreground">{extractorResult.recommendation}</p>
                  )}
                  {extractorResult.originalSimilarity !== undefined && (
                    <div>
                      <span className="text-sm font-medium">Similitud con original: </span>
                      <Badge>{(extractorResult.originalSimilarity * 100).toFixed(1)}%</Badge>
                    </div>
                  )}
                </motion.div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Result Display */}
      {result && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle>Resultado</CardTitle>
                <CardDescription>
                  Generado con {result.model.toUpperCase()} • {result.timestamp.toLocaleTimeString()}
                </CardDescription>
              </div>
              <Button variant="outline" size="sm" onClick={copyToClipboard}>
                {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
              </Button>
            </CardHeader>
            <CardContent>
              <div className="p-4 rounded-lg bg-muted whitespace-pre-wrap text-sm">
                {result.content}
              </div>
            </CardContent>
          </Card>
        </motion.div>
      )}

      {/* Generated Image Display */}
      {generatedImage && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Image className="w-5 h-5" />
                Imagen Generada
              </CardTitle>
              <CardDescription>Generada con FLUX</CardDescription>
            </CardHeader>
            <CardContent>
              <img 
                src={generatedImage} 
                alt="Generated" 
                className="w-full max-w-md rounded-lg border"
              />
            </CardContent>
          </Card>
        </motion.div>
      )}

      {/* Quick Actions */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Acciones Rápidas</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
            <Button 
              variant="outline" 
              size="sm"
              onClick={() => {
                setActiveTab('copy');
                setPrompt('Post viral para micro-realismo en piel oscura con call to action para booking');
              }}
            >
              Post Micro-realismo
            </Button>
            <Button 
              variant="outline" 
              size="sm"
              onClick={() => {
                setActiveTab('strategy');
                setPrompt('Campaña TikTok para full sleeves geométricos, target: millennials urbanos');
              }}
            >
              Campaña TikTok
            </Button>
            <Button 
              variant="outline" 
              size="sm"
              onClick={() => {
                setActiveTab('email');
                setPrompt('Email de seguimiento post-sesión, ofrecer retoque gratuito y descuento 15% en próximo tatuaje');
              }}
            >
              Email Follow-up
            </Button>
            <Button 
              variant="outline" 
              size="sm"
              onClick={() => {
                setActiveTab('copy');
                setPrompt('Reel viral mostrando proceso de tatuaje fine-line con música trending');
              }}
            >
              Script Reel
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
