import { useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';

// ============================================================================
// TYPES
// ============================================================================

export interface VisionAnalysisResult {
  styles: string[];
  elements: string[];
  colors: string[];
  complexity: 'simple' | 'moderate' | 'complex' | 'very_complex';
  estimatedHours: number;
  placement_suggestions: string[];
  mood: string;
  description: string;
  rawAnalysis?: string;
}

export interface UseGrokVisionReturn {
  analyze: (imageUrl: string, context?: string) => Promise<VisionAnalysisResult>;
  isAnalyzing: boolean;
  error: Error | null;
  usedFallback: boolean;
}

// ============================================================================
// GROK VISION PROMPTS
// ============================================================================

const ANALYSIS_PROMPT = `Analyze this tattoo or reference image. Provide a JSON response with:
{
  "styles": ["array of tattoo styles detected, e.g. blackwork, neo-traditional, fine-line"],
  "elements": ["key visual elements like skulls, flowers, animals, geometric shapes"],
  "colors": ["color palette: black, grey, specific colors if present"],
  "complexity": "simple|moderate|complex|very_complex",
  "estimatedHours": number (estimated tattoo time),
  "placement_suggestions": ["body areas that would suit this design"],
  "mood": "overall feeling/aesthetic",
  "description": "brief artistic description"
}`;

// ============================================================================
// HOOK
// ============================================================================

export function useGrokVision(): UseGrokVisionReturn {
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const [usedFallback, setUsedFallback] = useState(false);

  const analyze = useCallback(async (
    imageUrl: string,
    context?: string
  ): Promise<VisionAnalysisResult> => {
    setIsAnalyzing(true);
    setError(null);
    setUsedFallback(false);

    try {
      // Try Grok Vision first
      const response = await supabase.functions.invoke('grok-gateway', {
        body: {
          messages: [{ 
            role: 'user', 
            content: context ? `${context}\n\n${ANALYSIS_PROMPT}` : ANALYSIS_PROMPT 
          }],
          imageUrl,
          stream: false,
        },
      });

      // Check if Grok succeeded
      if (!response.error && response.data?.content && !response.data?.fallback) {
        // Try to parse JSON from response
        const content = response.data.content;
        const jsonMatch = content.match(/\{[\s\S]*\}/);
        
        if (jsonMatch) {
          try {
            const parsed = JSON.parse(jsonMatch[0]);
            return {
              styles: parsed.styles || ['custom'],
              elements: parsed.elements || [],
              colors: parsed.colors || ['black', 'grey'],
              complexity: parsed.complexity || 'moderate',
              estimatedHours: parsed.estimatedHours || 3,
              placement_suggestions: parsed.placement_suggestions || ['forearm'],
              mood: parsed.mood || 'artistic',
              description: parsed.description || content,
              rawAnalysis: content,
            };
          } catch {
            // JSON parse failed, use raw content
            return createDefaultResult(content);
          }
        }

        return createDefaultResult(content);
      }

      // Fallback to analyze-reference
      console.log('[useGrokVision] Falling back to analyze-reference');
      setUsedFallback(true);

      const fallbackResponse = await supabase.functions.invoke('analyze-reference', {
        body: { image_urls: [imageUrl] },
      });

      if (fallbackResponse.error) {
        throw new Error(fallbackResponse.error.message);
      }

      const data = fallbackResponse.data;
      return {
        styles: data.styles || ['custom'],
        elements: data.elements || [],
        colors: data.colors || ['black', 'grey'],
        complexity: data.complexity || 'moderate',
        estimatedHours: data.estimatedHours || 3,
        placement_suggestions: data.placementSuggestions || data.placement_suggestions || ['forearm'],
        mood: data.mood || 'artistic',
        description: data.description || 'Custom tattoo design',
      };

    } catch (err) {
      console.error('[useGrokVision] Error:', err);
      const error = err instanceof Error ? err : new Error('Vision analysis failed');
      setError(error);
      
      // Return sensible defaults on complete failure
      return {
        styles: ['custom'],
        elements: [],
        colors: ['black', 'grey'],
        complexity: 'moderate',
        estimatedHours: 3,
        placement_suggestions: ['forearm', 'upper arm'],
        mood: 'artistic',
        description: 'Unable to fully analyze image',
      };

    } finally {
      setIsAnalyzing(false);
    }
  }, []);

  return {
    analyze,
    isAnalyzing,
    error,
    usedFallback,
  };
}

// ============================================================================
// HELPERS
// ============================================================================

function createDefaultResult(rawContent: string): VisionAnalysisResult {
  // Extract what we can from the raw text
  const styles = extractList(rawContent, /styles?:?\s*([^.]+)/i) || ['custom'];
  const complexity = rawContent.toLowerCase().includes('complex') ? 'complex' : 'moderate';
  
  return {
    styles,
    elements: [],
    colors: ['black', 'grey'],
    complexity,
    estimatedHours: complexity === 'complex' ? 5 : 3,
    placement_suggestions: ['forearm', 'upper arm'],
    mood: 'artistic',
    description: rawContent.slice(0, 300),
    rawAnalysis: rawContent,
  };
}

function extractList(text: string, pattern: RegExp): string[] | null {
  const match = text.match(pattern);
  if (!match) return null;
  
  return match[1]
    .split(/[,;]/)
    .map(s => s.trim())
    .filter(s => s.length > 0 && s.length < 50);
}

export default useGrokVision;
