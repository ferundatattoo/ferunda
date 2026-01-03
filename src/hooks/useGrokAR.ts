/**
 * useGrokAR - Hook for Grok-powered AR and image analysis
 * 
 * Provides:
 * - Body part detection and placement suggestions
 * - Tattoo style analysis
 * - Design feasibility assessment
 * - AR placement optimization
 */

import { useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';

export interface BodyPartAnalysis {
  detectedPart: string;
  confidence: number;
  alternativePlacements: string[];
  skinTone: string;
  surfaceArea: 'small' | 'medium' | 'large';
  curvature: 'flat' | 'moderate' | 'curved';
  visibility: 'hidden' | 'partial' | 'visible';
}

export interface DesignAnalysis {
  styles: string[];
  elements: string[];
  colors: string[];
  complexity: 'simple' | 'moderate' | 'complex' | 'very_complex';
  estimatedHours: number;
  suggestedSize: { min: string; max: string };
  placementRecommendations: string[];
}

export interface PlacementOptimization {
  bodyPart: string;
  score: number;
  reasoning: string;
  scaleRecommendation: number;
  rotationRecommendation: number;
  warnings: string[];
}

export interface FeasibilityReport {
  overall: number;
  factors: Array<{
    name: string;
    score: number;
    impact: 'positive' | 'negative' | 'neutral';
    description: string;
  }>;
  recommendations: string[];
  warnings: string[];
}

interface GrokARResult {
  bodyAnalysis?: BodyPartAnalysis;
  designAnalysis?: DesignAnalysis;
  placementOptimization?: PlacementOptimization;
  feasibility?: FeasibilityReport;
}

export function useGrokAR() {
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastResult, setLastResult] = useState<GrokARResult | null>(null);

  /**
   * Analyze body photo for tattoo placement
   */
  const analyzeBodyPhoto = useCallback(async (imageUrl: string): Promise<BodyPartAnalysis | null> => {
    setIsAnalyzing(true);
    setError(null);

    try {
      const { data, error: fnError } = await supabase.functions.invoke('grok-gateway', {
        body: {
          messages: [{
            role: 'user',
            content: `Analyze this photo for tattoo placement. Identify the body part shown and provide placement analysis.

Respond with JSON:
{
  "detectedPart": "specific body part name (e.g., left inner forearm, upper back, right thigh)",
  "confidence": 0-100,
  "alternativePlacements": ["other areas visible in photo"],
  "skinTone": "light|medium|dark",
  "surfaceArea": "small|medium|large",
  "curvature": "flat|moderate|curved",
  "visibility": "hidden|partial|visible (how visible this area typically is)"
}

Be specific about anatomical position.`
          }],
          imageUrl,
          stream: false,
        },
      });

      if (fnError) throw fnError;

      const content = data?.content || '';
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      
      if (jsonMatch) {
        const analysis = JSON.parse(jsonMatch[0]) as BodyPartAnalysis;
        setLastResult(prev => ({ ...prev, bodyAnalysis: analysis }));
        return analysis;
      }

      return getDefaultBodyAnalysis();
    } catch (err) {
      console.error('[GrokAR] Body analysis error:', err);
      setError('Failed to analyze body photo');
      return getDefaultBodyAnalysis();
    } finally {
      setIsAnalyzing(false);
    }
  }, []);

  /**
   * Analyze tattoo design for style, complexity, and recommendations
   */
  const analyzeDesign = useCallback(async (imageUrl: string): Promise<DesignAnalysis | null> => {
    setIsAnalyzing(true);
    setError(null);

    try {
      const { data, error: fnError } = await supabase.functions.invoke('grok-gateway', {
        body: {
          messages: [{
            role: 'user',
            content: `Analyze this tattoo design image and provide detailed analysis.

Respond with JSON:
{
  "styles": ["detected tattoo styles (e.g., blackwork, fine-line, traditional, geometric)"],
  "elements": ["key visual elements (e.g., flowers, skull, geometric shapes)"],
  "colors": ["color palette used"],
  "complexity": "simple|moderate|complex|very_complex",
  "estimatedHours": number (estimated session hours),
  "suggestedSize": {"min": "smallest recommended (e.g., 3x3 inches)", "max": "largest recommended"},
  "placementRecommendations": ["best body areas for this design"]
}

Consider line work detail, shading complexity, and design intricacy.`
          }],
          imageUrl,
          stream: false,
        },
      });

      if (fnError) throw fnError;

      const content = data?.content || '';
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      
      if (jsonMatch) {
        const analysis = JSON.parse(jsonMatch[0]) as DesignAnalysis;
        setLastResult(prev => ({ ...prev, designAnalysis: analysis }));
        return analysis;
      }

      return getDefaultDesignAnalysis();
    } catch (err) {
      console.error('[GrokAR] Design analysis error:', err);
      setError('Failed to analyze design');
      return getDefaultDesignAnalysis();
    } finally {
      setIsAnalyzing(false);
    }
  }, []);

  /**
   * Get placement optimization for design + body combination
   */
  const optimizePlacement = useCallback(async (params: {
    designUrl: string;
    bodyUrl: string;
    preferredBodyPart?: string;
  }): Promise<PlacementOptimization | null> => {
    setIsAnalyzing(true);
    setError(null);

    try {
      // First analyze both images
      const [designAnalysis, bodyAnalysis] = await Promise.all([
        analyzeDesign(params.designUrl),
        analyzeBodyPhoto(params.bodyUrl),
      ]);

      const prompt = `Given this tattoo design analysis and body placement, optimize the placement.

Design Analysis: ${JSON.stringify(designAnalysis)}
Body Analysis: ${JSON.stringify(bodyAnalysis)}
${params.preferredBodyPart ? `Preferred placement: ${params.preferredBodyPart}` : ''}

Respond with JSON:
{
  "bodyPart": "recommended placement",
  "score": 0-100 (placement quality score),
  "reasoning": "why this placement works",
  "scaleRecommendation": 0.5-2.0 (scale factor),
  "rotationRecommendation": -45 to 45 (degrees),
  "warnings": ["any concerns about this placement"]
}

Consider body curvature, design complexity, visibility preferences.`;

      const { data, error: fnError } = await supabase.functions.invoke('grok-gateway', {
        body: {
          messages: [{ role: 'user', content: prompt }],
          stream: false,
        },
      });

      if (fnError) throw fnError;

      const content = data?.content || '';
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      
      if (jsonMatch) {
        const optimization = JSON.parse(jsonMatch[0]) as PlacementOptimization;
        setLastResult(prev => ({ ...prev, placementOptimization: optimization }));
        return optimization;
      }

      return null;
    } catch (err) {
      console.error('[GrokAR] Placement optimization error:', err);
      setError('Failed to optimize placement');
      return null;
    } finally {
      setIsAnalyzing(false);
    }
  }, [analyzeDesign, analyzeBodyPhoto]);

  /**
   * Generate comprehensive feasibility report
   */
  const generateFeasibilityReport = useCallback(async (params: {
    designUrl: string;
    bodyUrl?: string;
    clientInfo?: {
      skinType?: string;
      firstTattoo?: boolean;
      existingTattoos?: boolean;
    };
  }): Promise<FeasibilityReport | null> => {
    setIsAnalyzing(true);
    setError(null);

    try {
      const designAnalysis = await analyzeDesign(params.designUrl);
      let bodyAnalysis: BodyPartAnalysis | null = null;
      
      if (params.bodyUrl) {
        bodyAnalysis = await analyzeBodyPhoto(params.bodyUrl);
      }

      const prompt = `Generate a tattoo feasibility report.

Design Analysis: ${JSON.stringify(designAnalysis)}
${bodyAnalysis ? `Body Analysis: ${JSON.stringify(bodyAnalysis)}` : ''}
${params.clientInfo ? `Client Info: ${JSON.stringify(params.clientInfo)}` : ''}

Respond with JSON:
{
  "overall": 0-100 (overall feasibility score),
  "factors": [
    {
      "name": "factor name",
      "score": 0-100,
      "impact": "positive|negative|neutral",
      "description": "detailed explanation"
    }
  ],
  "recommendations": ["actionable recommendations"],
  "warnings": ["potential issues to address"]
}

Consider:
- Design complexity vs placement
- Skin type compatibility
- Expected healing
- Long-term appearance
- Session requirements`;

      const { data, error: fnError } = await supabase.functions.invoke('grok-gateway', {
        body: {
          messages: [{ role: 'user', content: prompt }],
          stream: false,
        },
      });

      if (fnError) throw fnError;

      const content = data?.content || '';
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      
      if (jsonMatch) {
        const report = JSON.parse(jsonMatch[0]) as FeasibilityReport;
        setLastResult(prev => ({ ...prev, feasibility: report }));
        return report;
      }

      return getDefaultFeasibility();
    } catch (err) {
      console.error('[GrokAR] Feasibility error:', err);
      setError('Failed to generate feasibility report');
      return getDefaultFeasibility();
    } finally {
      setIsAnalyzing(false);
    }
  }, [analyzeDesign, analyzeBodyPhoto]);

  return {
    isAnalyzing,
    error,
    lastResult,
    analyzeBodyPhoto,
    analyzeDesign,
    optimizePlacement,
    generateFeasibilityReport,
  };
}

// Default fallback data
function getDefaultBodyAnalysis(): BodyPartAnalysis {
  return {
    detectedPart: 'forearm',
    confidence: 70,
    alternativePlacements: ['upper arm', 'wrist'],
    skinTone: 'medium',
    surfaceArea: 'medium',
    curvature: 'moderate',
    visibility: 'visible',
  };
}

function getDefaultDesignAnalysis(): DesignAnalysis {
  return {
    styles: ['custom'],
    elements: ['artistic elements'],
    colors: ['black', 'grey'],
    complexity: 'moderate',
    estimatedHours: 3,
    suggestedSize: { min: '3x3 inches', max: '6x6 inches' },
    placementRecommendations: ['forearm', 'upper arm', 'calf'],
  };
}

function getDefaultFeasibility(): FeasibilityReport {
  return {
    overall: 80,
    factors: [
      { name: 'Design Complexity', score: 75, impact: 'neutral', description: 'Moderate complexity suitable for most placements' },
      { name: 'Placement Suitability', score: 85, impact: 'positive', description: 'Good canvas area for this design' },
    ],
    recommendations: ['Schedule a consultation to discuss details', 'Consider a test placement before final decision'],
    warnings: [],
  };
}

export default useGrokAR;
