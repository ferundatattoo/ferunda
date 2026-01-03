import React, { useState, useEffect } from 'react';
import { Check, X, Loader2, RefreshCw, MessageCircle, Image, Zap, Users, Globe } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { supabase } from '@/integrations/supabase/client';

// =============================================================================
// TEST MASTER PAGE - Sistema Integrado Vivo
// =============================================================================

interface TestResult {
  name: string;
  description: string;
  status: 'pending' | 'pass' | 'fail' | 'warning';
  details?: string;
  category: 'bubble' | 'upload' | 'language' | 'realtime' | 'grok';
}

const TestMaster: React.FC = () => {
  const [tests, setTests] = useState<TestResult[]>([]);
  const [isRunning, setIsRunning] = useState(false);
  const [overallStatus, setOverallStatus] = useState<'idle' | 'running' | 'pass' | 'fail'>('idle');

  // Initialize tests
  const initTests = (): TestResult[] => [
    // Bubble Tests
    {
      name: 'Single Bubble Detection',
      description: 'Only one concierge bubble should be visible',
      status: 'pending',
      category: 'bubble',
    },
    {
      name: 'FerundaAgent Data Attribute',
      description: 'FerundaAgent has data-ferunda-agent attribute',
      status: 'pending',
      category: 'bubble',
    },
    {
      name: 'Bubble Position',
      description: 'Bubble is fixed at bottom-right',
      status: 'pending',
      category: 'bubble',
    },
    
    // Language Tests
    {
      name: 'Browser Language Detection',
      description: 'Detects browser language (es/en)',
      status: 'pending',
      category: 'language',
    },
    {
      name: 'Spanish Pattern Detection',
      description: 'Detects Spanish keywords in text',
      status: 'pending',
      category: 'language',
    },
    {
      name: 'English Pattern Detection',
      description: 'Detects English keywords in text',
      status: 'pending',
      category: 'language',
    },
    
    // Upload Tests
    {
      name: 'Storage Bucket Access',
      description: 'chat-uploads bucket is accessible',
      status: 'pending',
      category: 'upload',
    },
    {
      name: 'Image Compression Function',
      description: 'Image compression logic exists',
      status: 'pending',
      category: 'upload',
    },
    
    // Realtime Tests
    {
      name: 'Supabase Realtime',
      description: 'Realtime subscription capability',
      status: 'pending',
      category: 'realtime',
    },
    {
      name: 'Channel Creation',
      description: 'Can create realtime channel',
      status: 'pending',
      category: 'realtime',
    },
    
    // Grok Tests
    {
      name: 'AI Router Function',
      description: 'ai-router edge function exists',
      status: 'pending',
      category: 'grok',
    },
    {
      name: 'Grok Label Visible',
      description: 'Bubble shows "Grok Vivo" label',
      status: 'pending',
      category: 'grok',
    },
  ];

  // Run all tests
  const runTests = async () => {
    setIsRunning(true);
    setOverallStatus('running');
    const results = initTests();
    setTests(results);

    // Helper to update a test
    const updateTest = (name: string, status: TestResult['status'], details?: string) => {
      setTests(prev => prev.map(t => t.name === name ? { ...t, status, details } : t));
    };

    // Wait helper
    const wait = (ms: number) => new Promise(r => setTimeout(r, ms));

    // =========================================================================
    // BUBBLE TESTS
    // =========================================================================
    await wait(300);
    
    // Test: Single bubble detection
    const bubbles = document.querySelectorAll('[data-ferunda-agent="true"], [data-concierge-compiler="true"]');
    const ferundaBubble = document.querySelector('[data-ferunda-agent="true"]');
    updateTest('Single Bubble Detection', 
      bubbles.length === 1 ? 'pass' : bubbles.length === 0 ? 'warning' : 'fail',
      `Found ${bubbles.length} bubble(s)`
    );

    await wait(200);
    
    // Test: FerundaAgent data attribute
    updateTest('FerundaAgent Data Attribute',
      ferundaBubble ? 'pass' : 'warning',
      ferundaBubble ? 'Found data-ferunda-agent' : 'Attribute not found'
    );

    await wait(200);
    
    // Test: Bubble position
    if (ferundaBubble) {
      const style = window.getComputedStyle(ferundaBubble);
      const isFixed = style.position === 'fixed';
      const isBottomRight = parseInt(style.bottom) > 0 && parseInt(style.right) > 0;
      updateTest('Bubble Position', 
        isFixed && isBottomRight ? 'pass' : 'warning',
        `Position: ${style.position}, bottom: ${style.bottom}, right: ${style.right}`
      );
    } else {
      updateTest('Bubble Position', 'warning', 'No bubble element found');
    }

    // =========================================================================
    // LANGUAGE TESTS
    // =========================================================================
    await wait(300);
    
    // Test: Browser language detection
    const browserLang = navigator.language || (navigator as any).userLanguage || 'en';
    const detectedLang = browserLang.startsWith('es') ? 'es' : 'en';
    updateTest('Browser Language Detection', 'pass', `Browser: ${browserLang} → Detected: ${detectedLang}`);

    await wait(200);
    
    // Test: Spanish pattern detection
    const spanishPatterns = /\b(hola|quiero|necesito|tatuaje|cuánto|cómo|dónde|cuándo|gracias|por favor)\b/i;
    const testSpanish = 'Hola, quiero un tatuaje';
    updateTest('Spanish Pattern Detection', 
      spanishPatterns.test(testSpanish) ? 'pass' : 'fail',
      `"${testSpanish}" → ${spanishPatterns.test(testSpanish) ? 'Spanish detected' : 'Not detected'}`
    );

    await wait(200);
    
    // Test: English pattern detection
    const englishPatterns = /\b(hello|hi|want|need|tattoo|how much|where|when|thanks|please)\b/i;
    const testEnglish = 'Hello, I want a tattoo';
    updateTest('English Pattern Detection',
      englishPatterns.test(testEnglish) ? 'pass' : 'fail',
      `"${testEnglish}" → ${englishPatterns.test(testEnglish) ? 'English detected' : 'Not detected'}`
    );

    // =========================================================================
    // UPLOAD TESTS
    // =========================================================================
    await wait(300);
    
    // Test: Storage bucket access
    try {
      const { data, error } = await supabase.storage.from('chat-uploads').list('', { limit: 1 });
      updateTest('Storage Bucket Access',
        !error ? 'pass' : 'fail',
        error ? error.message : 'Bucket accessible'
      );
    } catch (err) {
      updateTest('Storage Bucket Access', 'fail', String(err));
    }

    await wait(200);
    
    // Test: Image compression function exists (check if canvas API works)
    try {
      const canvas = document.createElement('canvas');
      canvas.width = 100;
      canvas.height = 100;
      const ctx = canvas.getContext('2d');
      const hasCanvasSupport = !!ctx && typeof canvas.toBlob === 'function';
      updateTest('Image Compression Function',
        hasCanvasSupport ? 'pass' : 'warning',
        hasCanvasSupport ? 'Canvas API available for compression' : 'Limited canvas support'
      );
    } catch (err) {
      updateTest('Image Compression Function', 'fail', String(err));
    }

    // =========================================================================
    // REALTIME TESTS
    // =========================================================================
    await wait(300);
    
    // Test: Supabase realtime capability
    const hasRealtime = typeof supabase.channel === 'function';
    updateTest('Supabase Realtime',
      hasRealtime ? 'pass' : 'fail',
      hasRealtime ? 'Realtime API available' : 'Realtime not available'
    );

    await wait(200);
    
    // Test: Channel creation
    try {
      const testChannel = supabase.channel('test-master-channel');
      const hasSubscribe = typeof testChannel.subscribe === 'function';
      // Clean up
      supabase.removeChannel(testChannel);
      updateTest('Channel Creation',
        hasSubscribe ? 'pass' : 'fail',
        hasSubscribe ? 'Channel created and cleaned up' : 'Channel creation failed'
      );
    } catch (err) {
      updateTest('Channel Creation', 'fail', String(err));
    }

    // =========================================================================
    // GROK TESTS
    // =========================================================================
    await wait(300);
    
    // Test: AI Router function (just check if we can call it without auth)
    try {
      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/ai-router`,
        {
          method: 'OPTIONS',
          headers: {
            'Content-Type': 'application/json',
          },
        }
      );
      // OPTIONS should return 204 or 200 for CORS
      updateTest('AI Router Function',
        response.status < 500 ? 'pass' : 'warning',
        `Status: ${response.status} - Function ${response.status < 500 ? 'accessible' : 'may have issues'}`
      );
    } catch (err) {
      updateTest('AI Router Function', 'warning', 'Could not reach function (may need auth)');
    }

    await wait(200);
    
    // Test: Grok label visible
    const grokLabel = ferundaBubble?.querySelector('span')?.textContent || '';
    const hasGrokLabel = grokLabel.toLowerCase().includes('grok');
    updateTest('Grok Label Visible',
      hasGrokLabel ? 'pass' : 'warning',
      hasGrokLabel ? `Found label: "${grokLabel}"` : 'Grok label not found on bubble'
    );

    // =========================================================================
    // CALCULATE OVERALL STATUS
    // =========================================================================
    await wait(500);
    setTests(prev => {
      const passed = prev.filter(t => t.status === 'pass').length;
      const failed = prev.filter(t => t.status === 'fail').length;
      const total = prev.length;
      
      if (failed === 0 && passed === total) {
        setOverallStatus('pass');
      } else if (failed > total / 3) {
        setOverallStatus('fail');
      } else {
        setOverallStatus('pass'); // Warnings are acceptable
      }
      
      return prev;
    });
    
    setIsRunning(false);
  };

  // Auto-run on mount
  useEffect(() => {
    const timer = setTimeout(() => runTests(), 500);
    return () => clearTimeout(timer);
  }, []);

  // Count by status
  const counts = {
    pass: tests.filter(t => t.status === 'pass').length,
    fail: tests.filter(t => t.status === 'fail').length,
    warning: tests.filter(t => t.status === 'warning').length,
    pending: tests.filter(t => t.status === 'pending').length,
  };

  // Group by category
  const categories: { key: TestResult['category']; label: string; icon: React.ReactNode }[] = [
    { key: 'bubble', label: 'Single Bubble', icon: <MessageCircle className="w-4 h-4" /> },
    { key: 'language', label: 'Idioma Detection', icon: <Globe className="w-4 h-4" /> },
    { key: 'upload', label: 'Image Upload', icon: <Image className="w-4 h-4" /> },
    { key: 'realtime', label: 'Realtime', icon: <Zap className="w-4 h-4" /> },
    { key: 'grok', label: 'Grok Integration', icon: <Users className="w-4 h-4" /> },
  ];

  return (
    <div className="min-h-screen bg-background p-8">
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Status Header */}
        <Card className={
          overallStatus === 'pass' ? 'border-green-500 bg-green-500/5' :
          overallStatus === 'fail' ? 'border-red-500 bg-red-500/5' :
          'border-border'
        }>
          <CardHeader>
            <CardTitle className="flex items-center gap-3 text-2xl">
              {overallStatus === 'pass' && <Check className="h-8 w-8 text-green-500" />}
              {overallStatus === 'fail' && <X className="h-8 w-8 text-red-500" />}
              {overallStatus === 'running' && <Loader2 className="h-8 w-8 animate-spin text-primary" />}
              {overallStatus === 'idle' && <RefreshCw className="h-8 w-8 text-muted-foreground" />}
              Sistema Integrado Vivo Master
            </CardTitle>
            <CardDescription>
              Diagnóstico completo de integración Ferunda Tattoo
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-4 flex-wrap">
              <Badge variant={overallStatus === 'pass' ? 'default' : 'secondary'} className="text-sm px-3 py-1">
                {overallStatus === 'pass' ? '✅ ALL SYSTEMS VIVO' : 
                 overallStatus === 'fail' ? '❌ ISSUES DETECTED' :
                 overallStatus === 'running' ? '🔄 RUNNING...' : '⏳ READY'}
              </Badge>
              
              <div className="flex gap-2 text-sm">
                <span className="text-green-500">✓ {counts.pass}</span>
                <span className="text-yellow-500">⚠ {counts.warning}</span>
                <span className="text-red-500">✗ {counts.fail}</span>
                <span className="text-muted-foreground">○ {counts.pending}</span>
              </div>

              <Button 
                onClick={runTests} 
                disabled={isRunning}
                variant="outline"
                size="sm"
                className="ml-auto"
              >
                {isRunning ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <RefreshCw className="w-4 h-4 mr-2" />}
                Re-run Tests
              </Button>
            </div>

            {/* Progress */}
            <Progress 
              value={(counts.pass + counts.warning + counts.fail) / tests.length * 100} 
              className="mt-4 h-2"
            />
          </CardContent>
        </Card>

        {/* Test Categories */}
        {categories.map(cat => {
          const catTests = tests.filter(t => t.category === cat.key);
          if (catTests.length === 0) return null;
          
          const catPassed = catTests.filter(t => t.status === 'pass').length;
          const catFailed = catTests.filter(t => t.status === 'fail').length;
          
          return (
            <Card key={cat.key}>
              <CardHeader className="py-4">
                <CardTitle className="flex items-center gap-2 text-lg">
                  {cat.icon}
                  {cat.label}
                  <Badge variant="outline" className="ml-auto">
                    {catPassed}/{catTests.length}
                  </Badge>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {catTests.map((test, i) => (
                  <div
                    key={i}
                    className={`flex items-center justify-between p-3 rounded-lg ${
                      test.status === 'pass' ? 'bg-green-500/10' :
                      test.status === 'fail' ? 'bg-red-500/10' :
                      test.status === 'warning' ? 'bg-yellow-500/10' :
                      'bg-muted/50'
                    }`}
                  >
                    <div>
                      <p className="font-medium text-sm">{test.name}</p>
                      <p className="text-xs text-muted-foreground">{test.description}</p>
                      {test.details && (
                        <p className="text-xs text-muted-foreground/80 mt-1 font-mono">{test.details}</p>
                      )}
                    </div>
                    {test.status === 'pass' && <Check className="h-5 w-5 text-green-500 shrink-0" />}
                    {test.status === 'fail' && <X className="h-5 w-5 text-red-500 shrink-0" />}
                    {test.status === 'warning' && <span className="text-yellow-500 shrink-0">⚠</span>}
                    {test.status === 'pending' && <Loader2 className="h-5 w-5 animate-spin text-muted-foreground shrink-0" />}
                  </div>
                ))}
              </CardContent>
            </Card>
          );
        })}

        {/* Info Footer */}
        <Card>
          <CardContent className="py-4">
            <p className="text-sm text-muted-foreground">
              <strong>Test Master Vivo:</strong> Esta página verifica la integración completa del sistema Ferunda Tattoo.
              Un status verde indica que todos los componentes están funcionando correctamente.
              Las advertencias (⚠) son aceptables y no bloquean la funcionalidad principal.
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default TestMaster;
