import { useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';

interface ConceptVariant {
  id: string;
  imageUrl: string;
  thumbnailUrl?: string;
  scores: {
    styleAlignment: number;
    clarity: number;
    uniqueness: number;
    arFitness: number;
  };
  selected?: boolean;
}

interface CoDesignSession {
  id: string;
  stage: 'init' | 'variants_ready' | 'selection' | 'refinement' | 'finalized';
  variants: ConceptVariant[];
  chosenVariantId?: string;
  iterationCount: number;
  feedback: Array<{ variantId: string; reaction: 'like' | 'dislike' | 'neutral'; notes?: string }>;
}

interface SketchResult {
  sketchId: string;
  lineartUrl: string;
  overlayUrl: string;
  svgUrl?: string;
}

export function useCoDesignSession(workspaceId?: string) {
  const [session, setSession] = useState<CoDesignSession | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Initialize a new CoDesign session
  const initSession = useCallback(async (
    conciergeSessionId: string,
    brief: Record<string, unknown>
  ): Promise<CoDesignSession | null> => {
    setIsLoading(true);
    setError(null);

    try {
      const { data, error: fnError } = await supabase.functions.invoke('codesign-engine', {
        body: {
          action: 'init_session',
          sessionId: conciergeSessionId,
          brief,
          workspaceId
        }
      });

      if (fnError) throw fnError;

      const newSession: CoDesignSession = {
        id: data.sessionId || conciergeSessionId,
        stage: 'init',
        variants: [],
        iterationCount: 0,
        feedback: []
      };

      setSession(newSession);
      return newSession;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to init CoDesign session';
      setError(errorMessage);
      console.error('[useCoDesignSession] Init error:', err);
      return null;
    } finally {
      setIsLoading(false);
    }
  }, [workspaceId]);

  // Generate concept variants
  const generateVariants = useCallback(async (count: number = 6): Promise<ConceptVariant[]> => {
    if (!session) {
      setError('No active session');
      return [];
    }

    setIsLoading(true);
    try {
      const { data, error: fnError } = await supabase.functions.invoke('codesign-engine', {
        body: {
          action: 'generate_variants',
          sessionId: session.id,
          count
        }
      });

      if (fnError) throw fnError;

      const variants: ConceptVariant[] = (data.variants || []).map((v: Record<string, unknown>) => ({
        id: v.id as string,
        imageUrl: v.image_url as string || v.imageUrl as string,
        thumbnailUrl: v.thumbnail_url as string,
        scores: {
          styleAlignment: (v.scores as Record<string, number>)?.style_alignment_score || 0.8,
          clarity: (v.scores as Record<string, number>)?.clarity_score || 0.75,
          uniqueness: (v.scores as Record<string, number>)?.uniqueness_score || 0.85,
          arFitness: (v.scores as Record<string, number>)?.ar_fitness_score || 0.8
        }
      }));

      setSession(prev => prev ? {
        ...prev,
        variants,
        stage: 'variants_ready'
      } : null);

      return variants;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to generate variants';
      setError(errorMessage);
      console.error('[useCoDesignSession] Generate error:', err);
      return [];
    } finally {
      setIsLoading(false);
    }
  }, [session]);

  // Record A/B choice (user preference)
  const recordChoice = useCallback(async (
    variantId: string,
    reaction: 'like' | 'dislike' | 'neutral',
    notes?: string
  ) => {
    if (!session) return;

    try {
      await supabase.functions.invoke('codesign-engine', {
        body: {
          action: 'ab_choice',
          sessionId: session.id,
          variantId,
          reaction,
          notes
        }
      });

      setSession(prev => prev ? {
        ...prev,
        feedback: [...prev.feedback, { variantId, reaction, notes }],
        stage: 'selection'
      } : null);
    } catch (err) {
      console.error('[useCoDesignSession] Choice error:', err);
    }
  }, [session]);

  // Select final variant
  const selectVariant = useCallback(async (variantId: string): Promise<boolean> => {
    if (!session) return false;

    setIsLoading(true);
    try {
      const { error: fnError } = await supabase.functions.invoke('codesign-engine', {
        body: {
          action: 'select_variant',
          sessionId: session.id,
          variantId
        }
      });

      if (fnError) throw fnError;

      setSession(prev => prev ? {
        ...prev,
        chosenVariantId: variantId,
        variants: prev.variants.map(v => ({
          ...v,
          selected: v.id === variantId
        })),
        stage: 'refinement'
      } : null);

      return true;
    } catch (err) {
      console.error('[useCoDesignSession] Select error:', err);
      return false;
    } finally {
      setIsLoading(false);
    }
  }, [session]);

  // Finalize and generate sketch
  const finalizeSketch = useCallback(async (): Promise<SketchResult | null> => {
    if (!session?.chosenVariantId) {
      setError('No variant selected');
      return null;
    }

    setIsLoading(true);
    try {
      const { data, error: fnError } = await supabase.functions.invoke('sketch-finalizer', {
        body: {
          action: 'finalize',
          sessionId: session.id,
          variantId: session.chosenVariantId,
          workspaceId
        }
      });

      if (fnError) throw fnError;

      setSession(prev => prev ? {
        ...prev,
        stage: 'finalized'
      } : null);

      return {
        sketchId: data.sketchId || data.sketch_id,
        lineartUrl: data.lineartUrl || data.lineart_png_url || '',
        overlayUrl: data.overlayUrl || data.overlay_png_url || '',
        svgUrl: data.svgUrl || data.svg_url
      };
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to finalize sketch';
      setError(errorMessage);
      console.error('[useCoDesignSession] Finalize error:', err);
      return null;
    } finally {
      setIsLoading(false);
    }
  }, [session, workspaceId]);

  // Request refinement with feedback
  const requestRefinement = useCallback(async (
    feedback: string,
    adjustments: Record<string, unknown>
  ): Promise<ConceptVariant[]> => {
    if (!session?.chosenVariantId) return [];

    setIsLoading(true);
    try {
      const { data, error: fnError } = await supabase.functions.invoke('codesign-engine', {
        body: {
          action: 'refine_variant',
          sessionId: session.id,
          variantId: session.chosenVariantId,
          feedback,
          adjustments
        }
      });

      if (fnError) throw fnError;

      const refinedVariants: ConceptVariant[] = (data.variants || []).map((v: Record<string, unknown>) => ({
        id: v.id as string,
        imageUrl: v.image_url as string,
        scores: {
          styleAlignment: 0.85,
          clarity: 0.8,
          uniqueness: 0.9,
          arFitness: 0.85
        }
      }));

      setSession(prev => prev ? {
        ...prev,
        variants: [...prev.variants, ...refinedVariants],
        iterationCount: prev.iterationCount + 1
      } : null);

      return refinedVariants;
    } catch (err) {
      console.error('[useCoDesignSession] Refine error:', err);
      return [];
    } finally {
      setIsLoading(false);
    }
  }, [session]);

  // Reset session
  const resetSession = useCallback(() => {
    setSession(null);
    setError(null);
  }, []);

  return {
    // State
    session,
    isLoading,
    error,
    variants: session?.variants || [],
    chosenVariant: session?.variants.find(v => v.id === session?.chosenVariantId),
    stage: session?.stage || null,
    
    // Methods
    initSession,
    generateVariants,
    recordChoice,
    selectVariant,
    finalizeSketch,
    requestRefinement,
    resetSession
  };
}

export default useCoDesignSession;
