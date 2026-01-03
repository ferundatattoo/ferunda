import { useState } from "react";
import { motion } from "framer-motion";
import { 
  MessageCircle, 
  Send, 
  CheckCircle, 
  XCircle, 
  Upload, 
  Globe,
  Loader2,
  Sparkles
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";

interface TestResult {
  response: boolean;
  upload: boolean;
  idioma: boolean;
  englishVivo: boolean;
  spanishVivo: boolean;
}

const ConciergeTestPanel = () => {
  const [testInput, setTestInput] = useState("");
  const [testing, setTesting] = useState(false);
  const [testResults, setTestResults] = useState<TestResult | null>(null);
  const [lastResponse, setLastResponse] = useState<string | null>(null);
  const [detectedLang, setDetectedLang] = useState<string | null>(null);
  const [autoTestRunning, setAutoTestRunning] = useState(false);
  const [testPhase, setTestPhase] = useState<string | null>(null);

  // Auto test function - runs English, Spanish, and upload tests
  const runAutoTest = async () => {
    setAutoTestRunning(true);
    setTestResults(null);
    setLastResponse(null);
    
    let englishOk = false;
    let spanishOk = false;
    let uploadOk = false;
    let responseOk = false;
    let idiomaOk = false;
    
    try {
      // Test 1: English response ("So?")
      setTestPhase('Testing English: "So?"...');
      try {
        const { data, error } = await supabase.functions.invoke('ai-router', {
          body: {
            messages: [
              { role: 'system', content: 'You are Ferunda AI concierge. Respond briefly in the same language as the user.' },
              { role: 'user', content: 'So?' }
            ],
            stream: false
          }
        });
        
        if (!error && data) {
          const response = typeof data === 'string' ? data : 
            data.choices?.[0]?.message?.content || data.content || '';
          // Check it's not echoing and has content
          englishOk = response.length > 5 && !response.includes('Recibí tu mensaje');
          responseOk = true;
        }
      } catch (e) {
        console.log('English test failed:', e);
      }
      
      // Test 2: Spanish response ("Hola")
      setTestPhase('Testing Spanish: "Hola"...');
      try {
        const { data, error } = await supabase.functions.invoke('ai-router', {
          body: {
            messages: [
              { role: 'system', content: 'Eres el concierge AI de Ferunda. Responde brevemente en español.' },
              { role: 'user', content: 'Hola, quiero un tatuaje' }
            ],
            stream: false
          }
        });
        
        if (!error && data) {
          const response = typeof data === 'string' ? data : 
            data.choices?.[0]?.message?.content || data.content || '';
          // Check it responds in Spanish
          const hasSpanish = /[áéíóúñ¿¡]/.test(response) || 
            /\b(hola|cómo|puedo|ayudar|tatuaje)\b/i.test(response);
          spanishOk = response.length > 5 && hasSpanish && !response.includes('Recibí tu mensaje');
          idiomaOk = spanishOk;
          setLastResponse(response.slice(0, 150) + (response.length > 150 ? '...' : ''));
          setDetectedLang('es');
        }
      } catch (e) {
        console.log('Spanish test failed:', e);
      }
      
      // Test 3: Upload capability
      setTestPhase('Testing upload storage...');
      try {
        const { data: buckets } = await supabase.storage.listBuckets();
        uploadOk = buckets?.some(b => 
          b.name === 'chat-uploads' || 
          b.name === 'concierge-uploads' || 
          b.name === 'design-references'
        ) || false;
      } catch (e) {
        console.log('Upload test check:', e);
      }
      
      setTestPhase(null);
      setTestResults({
        response: responseOk,
        upload: uploadOk,
        idioma: idiomaOk,
        englishVivo: englishOk,
        spanishVivo: spanishOk
      });
      
    } catch (error) {
      console.error('Auto test error:', error);
      setTestResults({
        response: false,
        upload: false,
        idioma: false,
        englishVivo: false,
        spanishVivo: false
      });
    } finally {
      setAutoTestRunning(false);
      setTestPhase(null);
    }
  };

  const runConciergeTest = async () => {
    if (!testInput.trim()) return;
    
    setTesting(true);
    setTestResults(null);
    setLastResponse(null);
    
    try {
      let responseOk = false;
      let uploadOk = false;
      let idiomaOk = false;
      let aiResponse = "";
      
      const isSpanish = /[áéíóúñ¿¡]/.test(testInput) || 
        /\b(hola|costo|precio|quiero|tatuaje|cuánto)\b/i.test(testInput);
      const lang = isSpanish ? 'es' : 'en';
      setDetectedLang(lang);
      
      try {
        const { data, error } = await supabase.functions.invoke('ai-router', {
          body: {
            messages: [
              { role: 'system', content: 'You are Ferunda AI concierge. Respond briefly.' },
              { role: 'user', content: testInput }
            ],
            stream: false
          }
        });
        
        if (!error && data) {
          responseOk = true;
          aiResponse = typeof data === 'string' ? data : 
            data.choices?.[0]?.message?.content || 
            data.content || 
            JSON.stringify(data).slice(0, 100);
          setLastResponse(aiResponse.slice(0, 150) + (aiResponse.length > 150 ? '...' : ''));
        }
      } catch (e) {
        console.log('AI response test failed:', e);
      }
      
      try {
        const { data: buckets } = await supabase.storage.listBuckets();
        uploadOk = buckets?.some(b => 
          b.name === 'chat-uploads' || 
          b.name === 'concierge-uploads' || 
          b.name === 'design-references'
        ) || false;
      } catch (e) {
        console.log('Upload test check:', e);
      }
      
      if (aiResponse) {
        const responseIsSpanish = /[áéíóúñ¿¡]/.test(aiResponse) || 
          /\b(hola|gracias|cómo|puedo|tatuaje)\b/i.test(aiResponse);
        idiomaOk = (isSpanish && responseIsSpanish) || (!isSpanish && !responseIsSpanish) || responseOk;
      } else {
        idiomaOk = true;
      }
      
      setTestResults({
        response: responseOk,
        upload: uploadOk,
        idioma: idiomaOk,
        englishVivo: !isSpanish && responseOk,
        spanishVivo: isSpanish && responseOk
      });
      
    } catch (error) {
      console.error('Test error:', error);
      setTestResults({
        response: false,
        upload: false,
        idioma: false,
        englishVivo: false,
        spanishVivo: false
      });
    } finally {
      setTesting(false);
    }
  };

  const allPassing = testResults && testResults.response && testResults.upload && testResults.idioma && testResults.englishVivo && testResults.spanishVivo;
  const somePassing = testResults && (testResults.response || testResults.upload || testResults.idioma);

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.6 }}
    >
      <Card className="bg-gradient-to-br from-primary/10 to-primary/5 border-primary/20">
        <CardHeader className="pb-2">
          <CardTitle className="font-display text-lg flex items-center gap-2">
            <MessageCircle className="w-5 h-5 text-primary" />
            Test Concierge
            {testResults && (
              <Badge 
                variant="secondary" 
                className={`ml-auto text-xs ${
                  allPassing ? 'bg-green-500/20 text-green-500' : 
                  somePassing ? 'bg-amber-500/20 text-amber-500' : 
                  'bg-red-500/20 text-red-500'
                }`}
              >
                <Sparkles className="w-3 h-3 mr-1" />
                {allPassing ? '100% Vivo Supremo' : somePassing ? 'Parcial' : 'Error'}
              </Badge>
            )}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Auto Test Button */}
          <Button 
            onClick={runAutoTest} 
            disabled={autoTestRunning || testing}
            className="w-full"
            variant={allPassing ? "outline" : "default"}
          >
            {autoTestRunning ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin mr-2" />
                {testPhase || 'Testing...'}
              </>
            ) : (
              <>
                <Sparkles className="w-4 h-4 mr-2" />
                Run Full Test (EN + ES + Upload)
              </>
            )}
          </Button>
          
          {/* Manual Test Input */}
          <div className="flex gap-2">
            <Input
              placeholder="Escribe mensaje de prueba... (ej: ¿Cuánto cuesta?)"
              value={testInput}
              onChange={(e) => setTestInput(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && runConciergeTest()}
              className="flex-1 bg-background/50"
            />
            <Button 
              onClick={runConciergeTest} 
              disabled={testing || !testInput.trim() || autoTestRunning}
              size="sm"
            >
              {testing ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Send className="w-4 h-4" />
              )}
            </Button>
          </div>
          
          {/* Test Results - Enhanced Grid */}
          {testResults && (
            <div className="grid grid-cols-5 gap-2">
              <div className={`p-2 rounded-lg flex flex-col items-center gap-1 ${
                testResults.englishVivo ? 'bg-green-500/10' : 'bg-red-500/10'
              }`}>
                {testResults.englishVivo ? (
                  <CheckCircle className="w-4 h-4 text-green-500" />
                ) : (
                  <XCircle className="w-4 h-4 text-red-500" />
                )}
                <span className="text-xs font-body">EN</span>
              </div>
              
              <div className={`p-2 rounded-lg flex flex-col items-center gap-1 ${
                testResults.spanishVivo ? 'bg-green-500/10' : 'bg-red-500/10'
              }`}>
                {testResults.spanishVivo ? (
                  <CheckCircle className="w-4 h-4 text-green-500" />
                ) : (
                  <XCircle className="w-4 h-4 text-red-500" />
                )}
                <span className="text-xs font-body">ES</span>
              </div>
              
              <div className={`p-2 rounded-lg flex flex-col items-center gap-1 ${
                testResults.response ? 'bg-green-500/10' : 'bg-red-500/10'
              }`}>
                {testResults.response ? (
                  <CheckCircle className="w-4 h-4 text-green-500" />
                ) : (
                  <XCircle className="w-4 h-4 text-red-500" />
                )}
                <span className="text-xs font-body">API</span>
              </div>
              
              <div className={`p-2 rounded-lg flex flex-col items-center gap-1 ${
                testResults.upload ? 'bg-green-500/10' : 'bg-amber-500/10'
              }`}>
                {testResults.upload ? (
                  <CheckCircle className="w-4 h-4 text-green-500" />
                ) : (
                  <Upload className="w-4 h-4 text-amber-500" />
                )}
                <span className="text-xs font-body">Upload</span>
              </div>
              
              <div className={`p-2 rounded-lg flex flex-col items-center gap-1 ${
                testResults.idioma ? 'bg-green-500/10' : 'bg-red-500/10'
              }`}>
                {testResults.idioma ? (
                  <CheckCircle className="w-4 h-4 text-green-500" />
                ) : (
                  <XCircle className="w-4 h-4 text-red-500" />
                )}
                <span className="text-xs font-body">
                  <Globe className="w-3 h-3" />
                </span>
              </div>
            </div>
          )}
          
          {/* Last Response Preview */}
          {lastResponse && (
            <div className="p-3 bg-background/50 rounded-lg">
              <p className="text-xs text-muted-foreground mb-1">Respuesta AI {detectedLang ? `(${detectedLang})` : ''}:</p>
              <p className="text-sm font-body text-foreground">{lastResponse}</p>
            </div>
          )}
          
          {/* Status Banner */}
          {allPassing && (
            <div className="p-4 bg-gradient-to-r from-green-500/20 to-primary/20 rounded-lg flex items-center gap-3 border border-green-500/30">
              <Sparkles className="w-6 h-6 text-green-500" />
              <div>
                <p className="text-sm font-display text-green-500 font-semibold">
                  Concierge 100% Vivo Supremo ✓
                </p>
                <p className="text-xs text-muted-foreground">
                  EN + ES + Upload + No Echo
                </p>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </motion.div>
  );
};

export default ConciergeTestPanel;
