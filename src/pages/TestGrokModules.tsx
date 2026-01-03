import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  MessageCircle, Image, Loader2, CheckCircle, XCircle, 
  Zap, Upload, Eye, Brain, DollarSign, Wand2, Camera
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useGrokChat } from '@/hooks/useGrokChat';
import { useGrokVision } from '@/hooks/useGrokVision';
import { useGrokFinance } from '@/hooks/useGrokFinance';
import { useGrokMarketing } from '@/hooks/useGrokMarketing';
import { useGrokAR } from '@/hooks/useGrokAR';
import { toast } from 'sonner';

// ============================================================================
// TEST COMPONENTS
// ============================================================================

const ConciergeTest: React.FC = () => {
  const [message, setMessage] = useState('');
  const [response, setResponse] = useState('');
  const [streamedContent, setStreamedContent] = useState('');
  
  const { sendMessage, isLoading, usedFallback } = useGrokChat({
    onStream: (chunk) => setStreamedContent(prev => prev + chunk),
    onComplete: (full) => setResponse(full),
  });

  const handleTest = async () => {
    if (!message.trim()) return;
    setStreamedContent('');
    setResponse('');
    
    try {
      await sendMessage([{ role: 'user', content: message }]);
      toast.success('Grok response received');
    } catch (err) {
      toast.error('Test failed');
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <MessageCircle className="w-5 h-5" />
          Concierge Chat Test
        </CardTitle>
        <CardDescription>Test Grok-powered chat responses</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex gap-2">
          <Input
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            placeholder="Type a message in English or Spanish..."
            onKeyDown={(e) => e.key === 'Enter' && handleTest()}
          />
          <Button onClick={handleTest} disabled={isLoading}>
            {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Send'}
          </Button>
        </div>

        {(streamedContent || response) && (
          <div className="p-4 bg-muted rounded-lg">
            <div className="flex items-center gap-2 mb-2">
              <Badge variant={usedFallback ? "secondary" : "default"}>
                {usedFallback ? 'Fallback' : 'Grok'}
              </Badge>
            </div>
            <p className="text-sm">{streamedContent || response}</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

const VisionTest: React.FC = () => {
  const [imageUrl, setImageUrl] = useState('');
  const [result, setResult] = useState<any>(null);
  
  const { analyze, isAnalyzing, usedFallback } = useGrokVision();

  const handleTest = async () => {
    if (!imageUrl.trim()) {
      toast.error('Enter an image URL');
      return;
    }
    
    try {
      const analysis = await analyze(imageUrl);
      setResult(analysis);
      toast.success('Vision analysis complete');
    } catch (err) {
      toast.error('Vision test failed');
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Eye className="w-5 h-5" />
          Vision Analysis Test
        </CardTitle>
        <CardDescription>Test Grok Vision for image analysis</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex gap-2">
          <Input
            value={imageUrl}
            onChange={(e) => setImageUrl(e.target.value)}
            placeholder="Paste image URL..."
          />
          <Button onClick={handleTest} disabled={isAnalyzing}>
            {isAnalyzing ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Analyze'}
          </Button>
        </div>

        {result && (
          <div className="p-4 bg-muted rounded-lg space-y-2">
            <div className="flex items-center gap-2 mb-2">
              <Badge variant={usedFallback ? "secondary" : "default"}>
                {usedFallback ? 'Fallback' : 'Grok Vision'}
              </Badge>
            </div>
            <div className="grid grid-cols-2 gap-2 text-sm">
              <div><strong>Styles:</strong> {result.styles?.join(', ')}</div>
              <div><strong>Complexity:</strong> {result.complexity}</div>
              <div><strong>Colors:</strong> {result.colors?.join(', ')}</div>
              <div><strong>Est. Hours:</strong> {result.estimatedHours}</div>
            </div>
            <p className="text-sm text-muted-foreground">{result.description}</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

const GatewayTest: React.FC = () => {
  const [status, setStatus] = useState<'idle' | 'testing' | 'success' | 'error'>('idle');
  const [result, setResult] = useState<any>(null);

  const testGateway = async () => {
    setStatus('testing');
    try {
      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/concierge-gateway`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
          },
          body: JSON.stringify({
            messages: [{ role: 'user', content: 'Hello, what tattoo styles do you specialize in?' }],
          }),
        }
      );

      const provider = response.headers.get('X-Gateway-Provider');
      const latency = response.headers.get('X-Gateway-Latency');
      
      // Read stream to get content
      const reader = response.body?.getReader();
      const decoder = new TextDecoder();
      let content = '';
      
      if (reader) {
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          const chunk = decoder.decode(value, { stream: true });
          const lines = chunk.split('\n');
          for (const line of lines) {
            if (line.startsWith('data: ') && line !== 'data: [DONE]') {
              try {
                const parsed = JSON.parse(line.slice(6));
                const delta = parsed.choices?.[0]?.delta?.content;
                if (delta) content += delta;
              } catch {}
            }
          }
        }
      }

      setResult({ provider, latency, content: content.slice(0, 200) + '...' });
      setStatus('success');
      toast.success(`Gateway responded via ${provider}`);
    } catch (err) {
      setStatus('error');
      toast.error('Gateway test failed');
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Zap className="w-5 h-5" />
          Gateway Integration Test
        </CardTitle>
        <CardDescription>Test concierge-gateway with Grok routing</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <Button onClick={testGateway} disabled={status === 'testing'}>
          {status === 'testing' ? (
            <><Loader2 className="w-4 h-4 animate-spin mr-2" /> Testing...</>
          ) : (
            'Test Gateway'
          )}
        </Button>

        {result && (
          <div className="p-4 bg-muted rounded-lg space-y-2">
            <div className="flex items-center gap-2">
              <Badge variant={result.provider === 'grok' ? 'default' : 'secondary'}>
                Provider: {result.provider}
              </Badge>
              <Badge variant="outline">{result.latency}</Badge>
            </div>
            <p className="text-sm">{result.content}</p>
          </div>
        )}

        <div className="flex items-center gap-2">
          {status === 'success' && <CheckCircle className="w-5 h-5 text-green-500" />}
          {status === 'error' && <XCircle className="w-5 h-5 text-red-500" />}
          <span className="text-sm text-muted-foreground">
            {status === 'idle' && 'Ready to test'}
            {status === 'testing' && 'Testing gateway...'}
            {status === 'success' && 'Gateway working correctly'}
            {status === 'error' && 'Gateway test failed'}
          </span>
        </div>
      </CardContent>
    </Card>
  );
};

const DirectGrokTest: React.FC = () => {
  const [status, setStatus] = useState<'idle' | 'testing' | 'success' | 'error'>('idle');
  const [result, setResult] = useState<any>(null);

  const testDirect = async () => {
    setStatus('testing');
    try {
      const { data, error } = await supabase.functions.invoke('grok-gateway', {
        body: {
          messages: [{ role: 'user', content: 'Say hello in 5 words or less' }],
          stream: false,
        },
      });

      if (error) throw error;

      setResult({
        content: data?.content,
        language: data?.language,
      });
      setStatus('success');
      toast.success('Direct Grok call successful');
    } catch (err) {
      setStatus('error');
      setResult({ error: String(err) });
      toast.error('Direct Grok test failed');
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Brain className="w-5 h-5" />
          Direct Grok API Test
        </CardTitle>
        <CardDescription>Test grok-gateway edge function directly</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <Button onClick={testDirect} disabled={status === 'testing'}>
          {status === 'testing' ? (
            <><Loader2 className="w-4 h-4 animate-spin mr-2" /> Testing...</>
          ) : (
            'Test Direct API'
          )}
        </Button>

        {result && (
          <div className="p-4 bg-muted rounded-lg space-y-2">
            {result.error ? (
              <p className="text-red-500 text-sm">{result.error}</p>
            ) : (
              <>
                <Badge variant="outline">Language: {result.language}</Badge>
                <p className="text-sm">{result.content}</p>
              </>
            )}
          </div>
        )}

        <div className="flex items-center gap-2">
          {status === 'success' && <CheckCircle className="w-5 h-5 text-green-500" />}
          {status === 'error' && <XCircle className="w-5 h-5 text-red-500" />}
        </div>
      </CardContent>
    </Card>
  );
};

// Finance Module Test
const FinanceTest: React.FC = () => {
  const [result, setResult] = useState<any>(null);
  const { generateInsights, isAnalyzing } = useGrokFinance();

  const testFinance = async () => {
    const insights = await generateInsights({
      metrics: {
        revenue: 15000,
        revenueChange: 12,
        avgTicket: 450,
        ticketChange: 5,
        bookings: 35,
        conversionRate: 68,
      },
      period: 'month',
    });
    setResult(insights);
    toast.success('Finance analysis complete');
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <DollarSign className="w-5 h-5" />
          Finance Module Test
        </CardTitle>
        <CardDescription>Test Grok-powered financial insights</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <Button onClick={testFinance} disabled={isAnalyzing}>
          {isAnalyzing ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Brain className="w-4 h-4 mr-2" />}
          Generate Insights
        </Button>
        {result && (
          <div className="space-y-2">
            {result.map((insight: any, i: number) => (
              <div key={i} className="p-3 bg-muted rounded-lg">
                <Badge variant={insight.type === 'opportunity' ? 'default' : insight.type === 'warning' ? 'destructive' : 'secondary'}>
                  {insight.type}
                </Badge>
                <p className="font-medium mt-1">{insight.title}</p>
                <p className="text-sm text-muted-foreground">{insight.description}</p>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
};

// Marketing Module Test
const MarketingTest: React.FC = () => {
  const [result, setResult] = useState<any>(null);
  const { generateCaptions, isGenerating } = useGrokMarketing();

  const testMarketing = async () => {
    const captions = await generateCaptions({
      topic: 'New geometric sleeve tattoo completed',
      platform: 'instagram',
      tone: 'artistic',
      language: 'es',
      variations: 2,
    });
    setResult(captions);
    toast.success('Content generated');
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Wand2 className="w-5 h-5" />
          Marketing Module Test
        </CardTitle>
        <CardDescription>Test Grok-powered content generation</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <Button onClick={testMarketing} disabled={isGenerating}>
          {isGenerating ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Wand2 className="w-4 h-4 mr-2" />}
          Generate Captions
        </Button>
        {result && (
          <div className="space-y-2">
            {result.map((caption: any, i: number) => (
              <div key={i} className="p-3 bg-muted rounded-lg">
                <div className="flex items-center gap-2 mb-2">
                  <Badge>{caption.platform}</Badge>
                  <Badge variant="outline">{Math.round(caption.engagementPrediction)}% engagement</Badge>
                </div>
                <p className="text-sm whitespace-pre-line">{caption.content}</p>
                <p className="text-xs text-muted-foreground mt-2">
                  Hashtags: {caption.hashtags?.slice(0, 5).map((h: string) => `#${h}`).join(' ')}
                </p>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
};

// AR Module Test
const ARTest: React.FC = () => {
  const [imageUrl, setImageUrl] = useState('');
  const [result, setResult] = useState<any>(null);
  const { analyzeDesign, isAnalyzing } = useGrokAR();

  const testAR = async () => {
    if (!imageUrl.trim()) {
      toast.error('Enter an image URL');
      return;
    }
    const analysis = await analyzeDesign(imageUrl);
    setResult(analysis);
    toast.success('AR analysis complete');
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Camera className="w-5 h-5" />
          AR Module Test
        </CardTitle>
        <CardDescription>Test Grok-powered AR/design analysis</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex gap-2">
          <Input
            value={imageUrl}
            onChange={(e) => setImageUrl(e.target.value)}
            placeholder="Paste design image URL..."
          />
          <Button onClick={testAR} disabled={isAnalyzing}>
            {isAnalyzing ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Analyze'}
          </Button>
        </div>
        {result && (
          <div className="p-4 bg-muted rounded-lg space-y-2">
            <div className="grid grid-cols-2 gap-2 text-sm">
              <div><strong>Styles:</strong> {result.styles?.join(', ')}</div>
              <div><strong>Complexity:</strong> {result.complexity}</div>
              <div><strong>Est. Hours:</strong> {result.estimatedHours}</div>
              <div><strong>Size:</strong> {result.suggestedSize?.min} - {result.suggestedSize?.max}</div>
            </div>
            <p className="text-sm"><strong>Best placements:</strong> {result.placementRecommendations?.join(', ')}</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

// ============================================================================
// MAIN PAGE
// ============================================================================

const TestGrokModules: React.FC = () => {
  return (
    <div className="min-h-screen bg-background p-6">
      <div className="max-w-6xl mx-auto space-y-6">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold mb-2">Grok Integration Test Suite</h1>
          <p className="text-muted-foreground">
            Test all Grok-powered modules: Chat, Vision, Finance, Marketing, AR
          </p>
        </div>

        <Tabs defaultValue="gateway" className="w-full">
          <TabsList className="grid w-full grid-cols-7">
            <TabsTrigger value="gateway">Gateway</TabsTrigger>
            <TabsTrigger value="direct">Direct</TabsTrigger>
            <TabsTrigger value="concierge">Chat</TabsTrigger>
            <TabsTrigger value="vision">Vision</TabsTrigger>
            <TabsTrigger value="finance">Finance</TabsTrigger>
            <TabsTrigger value="marketing">Marketing</TabsTrigger>
            <TabsTrigger value="ar">AR</TabsTrigger>
          </TabsList>

          <TabsContent value="gateway" className="mt-4">
            <GatewayTest />
          </TabsContent>

          <TabsContent value="direct" className="mt-4">
            <DirectGrokTest />
          </TabsContent>

          <TabsContent value="concierge" className="mt-4">
            <ConciergeTest />
          </TabsContent>

          <TabsContent value="vision" className="mt-4">
            <VisionTest />
          </TabsContent>

          <TabsContent value="finance" className="mt-4">
            <FinanceTest />
          </TabsContent>

          <TabsContent value="marketing" className="mt-4">
            <MarketingTest />
          </TabsContent>

          <TabsContent value="ar" className="mt-4">
            <ARTest />
          </TabsContent>
        </Tabs>

        <Card className="bg-muted/50">
          <CardContent className="p-4">
            <h3 className="font-semibold mb-2">Integration Status</h3>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
              <div className="flex items-center gap-2">
                <CheckCircle className="w-4 h-4 text-green-500" />
                <span>grok-gateway</span>
              </div>
              <div className="flex items-center gap-2">
                <CheckCircle className="w-4 h-4 text-green-500" />
                <span>useGrokChat</span>
              </div>
              <div className="flex items-center gap-2">
                <CheckCircle className="w-4 h-4 text-green-500" />
                <span>useGrokVision</span>
              </div>
              <div className="flex items-center gap-2">
                <CheckCircle className="w-4 h-4 text-green-500" />
                <span>useGrokFinance</span>
              </div>
              <div className="flex items-center gap-2">
                <CheckCircle className="w-4 h-4 text-green-500" />
                <span>useGrokMarketing</span>
              </div>
              <div className="flex items-center gap-2">
                <CheckCircle className="w-4 h-4 text-green-500" />
                <span>useGrokAR</span>
              </div>
              <div className="flex items-center gap-2">
                <CheckCircle className="w-4 h-4 text-green-500" />
                <span>concierge-gateway</span>
              </div>
              <div className="flex items-center gap-2">
                <CheckCircle className="w-4 h-4 text-green-500" />
                <span>DesignEngine</span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default TestGrokModules;
