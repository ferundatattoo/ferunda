/**
 * DesignEngineInternal - Internal service for AI-powered design operations
 * 
 * This service provides:
 * - Reference image analysis
 * - Portfolio matching (compare client refs to artist work)
 * - Pre-sketch generation
 * - AR asset preparation
 * 
 * Works for both Solo Artists and Studios (routes to specific artist portfolios)
 */

import { supabase } from "@/integrations/supabase/client";

// ============================================================================
// TYPES
// ============================================================================

export interface ReferenceAnalysis {
  styles: string[];
  elements: string[];
  colors: string[];
  complexity: "simple" | "moderate" | "complex" | "very_complex";
  estimatedHours: number;
  placement_suggestions: string[];
  mood: string;
  description: string;
}

export interface PortfolioMatch {
  matchPercentage: number;
  similarPieces: Array<{
    id: string;
    imageUrl: string;
    styleMatch: number;
    techniqueSimilarity: number;
  }>;
  styleAnalysis: {
    detectedStyles: string[];
    artistExpertise: number;
    recommendedArtist?: {
      id: string;
      name: string;
      matchScore: number;
    };
  };
  feasibility: "perfect_match" | "good_match" | "possible" | "challenging" | "not_recommended";
  notes: string[];
}

export interface SketchParams {
  referenceUrls: string[];
  clientDescription: string;
  preferredStyle?: string;
  placement?: string;
  size?: string;
  artistId?: string;
  workspaceId: string;
}

export interface GeneratedSketch {
  id: string;
  imageUrl: string;
  thumbnailUrl?: string;
  analysis: ReferenceAnalysis;
  portfolioMatch?: PortfolioMatch;
  aiDescription: string;
  iterations: number;
  createdAt: Date;
}

export interface ARReadyAsset {
  sketchId: string;
  originalUrl: string;
  transparentUrl: string;
  suggestedPlacements: string[];
  scaleFactor: number;
}

export interface FullAnalysisResult {
  visionStack: {
    quality: { score: number; issues: string[] };
    bodyPart: { detected: string; confidence: number };
    existingTattoo: { present: boolean; extractedUrl?: string };
  };
  styleDna: {
    tokens: string[];
    matchScore: number;
    similarPortfolio: Array<{ id: string; url: string; score: number }>;
  };
  feasibility: {
    score: number;
    factors: Array<{ name: string; impact: string; score: number }>;
    risks: string[];
    recommendation: string;
  };
}

// ============================================================================
// MAIN SERVICE CLASS
// ============================================================================

class DesignEngineInternalService {
  private static instance: DesignEngineInternalService;

  private constructor() {}

  static getInstance(): DesignEngineInternalService {
    if (!DesignEngineInternalService.instance) {
      DesignEngineInternalService.instance = new DesignEngineInternalService();
    }
    return DesignEngineInternalService.instance;
  }

  /**
   * Analyze reference images using Grok Vision first, fallback to analyze-reference
   */
  async analyzeReference(imageUrl: string): Promise<ReferenceAnalysis> {
    try {
      // Try Grok Vision first for richer analysis
      const grokAnalysis = await this.analyzeWithGrokVision(imageUrl);
      if (grokAnalysis) {
        console.log("[DesignEngine] Used Grok Vision for analysis");
        return grokAnalysis;
      }
    } catch (err) {
      console.warn("[DesignEngine] Grok Vision failed, falling back:", err);
    }

    // Fallback to analyze-reference edge function
    try {
      const { data, error } = await supabase.functions.invoke("analyze-reference", {
        body: { image_urls: [imageUrl] },
      });

      if (error) throw error;

      return {
        styles: data.styles || ["custom"],
        elements: data.elements || [],
        colors: data.colors || ["black", "grey"],
        complexity: data.complexity || "moderate",
        estimatedHours: data.estimatedHours || 3,
        placement_suggestions: data.placementSuggestions || ["forearm", "upper arm"],
        mood: data.mood || "artistic",
        description: data.description || "Custom tattoo design",
      };
    } catch (err) {
      console.error("Failed to analyze reference:", err);
      return {
        styles: ["custom"],
        elements: [],
        colors: ["black", "grey"],
        complexity: "moderate",
        estimatedHours: 3,
        placement_suggestions: ["forearm"],
        mood: "artistic",
        description: "Custom tattoo design",
      };
    }
  }

  /**
   * Analyze image using Grok Vision API
   */
  private async analyzeWithGrokVision(imageUrl: string): Promise<ReferenceAnalysis | null> {
    try {
      const { data, error } = await supabase.functions.invoke("grok-gateway", {
        body: {
          messages: [{ 
            role: "user", 
            content: `Analyze this tattoo or reference image and provide a JSON response with:
{
  "styles": ["array of tattoo styles detected"],
  "elements": ["key visual elements"],
  "colors": ["color palette"],
  "complexity": "simple|moderate|complex|very_complex",
  "estimatedHours": number,
  "placement_suggestions": ["body areas"],
  "mood": "overall feeling",
  "description": "brief artistic description"
}`
          }],
          imageUrl,
          stream: false,
        },
      });

      if (error || data?.fallback) return null;

      const content = data?.content || "";
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      
      if (!jsonMatch) return null;

      const parsed = JSON.parse(jsonMatch[0]);
      return {
        styles: parsed.styles || ["custom"],
        elements: parsed.elements || [],
        colors: parsed.colors || ["black", "grey"],
        complexity: parsed.complexity || "moderate",
        estimatedHours: parsed.estimatedHours || 3,
        placement_suggestions: parsed.placement_suggestions || ["forearm"],
        mood: parsed.mood || "artistic",
        description: parsed.description || content.slice(0, 200),
      };
    } catch (err) {
      console.warn("[DesignEngine] Grok Vision parse failed:", err);
      return null;
    }
  }

  /**
   * Compare client references with artist portfolio
   * For studios, can compare across multiple artists to find best match
   */
  async matchWithPortfolio(
    analysis: ReferenceAnalysis,
    artistId?: string,
    workspaceId?: string
  ): Promise<PortfolioMatch> {
    try {
      // Fetch artist portfolio embeddings
      let query = supabase
        .from("artist_portfolio_embeddings")
        .select("id, image_url, style_tags, artist_id");

      if (artistId) {
        query = query.eq("artist_id", artistId);
      } else if (workspaceId) {
        query = query.eq("workspace_id", workspaceId);
      }

      const { data: portfolio, error } = await query.limit(50);

      if (error) throw error;

      if (!portfolio || portfolio.length === 0) {
        return {
          matchPercentage: 75,
          similarPieces: [],
          styleAnalysis: {
            detectedStyles: analysis.styles,
            artistExpertise: 0.8,
          },
          feasibility: "good_match",
          notes: ["Limited portfolio data available for comparison"],
        };
      }

      // Simple style-based matching (real implementation would use embeddings)
      const styleMatches = portfolio.filter((piece) => {
        const pieceStyles = piece.style_tags || [];
        return analysis.styles.some((style) =>
          pieceStyles.some((ps: string) => ps.toLowerCase().includes(style.toLowerCase()))
        );
      });

      const matchPercentage = portfolio.length > 0
        ? Math.round((styleMatches.length / portfolio.length) * 100)
        : 70;

      const similarPieces = styleMatches.slice(0, 5).map((piece) => ({
        id: piece.id,
        imageUrl: piece.image_url,
        styleMatch: 0.85,
        techniqueSimilarity: 0.8,
      }));

      // Determine feasibility based on match
      let feasibility: PortfolioMatch["feasibility"] = "good_match";
      if (matchPercentage >= 80) feasibility = "perfect_match";
      else if (matchPercentage >= 60) feasibility = "good_match";
      else if (matchPercentage >= 40) feasibility = "possible";
      else if (matchPercentage >= 20) feasibility = "challenging";
      else feasibility = "not_recommended";

      return {
        matchPercentage,
        similarPieces,
        styleAnalysis: {
          detectedStyles: analysis.styles,
          artistExpertise: matchPercentage / 100,
        },
        feasibility,
        notes: this.generateMatchNotes(analysis, matchPercentage),
      };
    } catch (err) {
      console.error("Failed to match portfolio:", err);
      return {
        matchPercentage: 70,
        similarPieces: [],
        styleAnalysis: {
          detectedStyles: analysis.styles,
          artistExpertise: 0.7,
        },
        feasibility: "good_match",
        notes: ["Could not fully analyze portfolio match"],
      };
    }
  }

  private generateMatchNotes(analysis: ReferenceAnalysis, matchPercentage: number): string[] {
    const notes: string[] = [];

    if (matchPercentage >= 80) {
      notes.push("Excellent style alignment with artist portfolio");
    } else if (matchPercentage >= 50) {
      notes.push("Good foundation for this style in portfolio");
    } else {
      notes.push("This style may require extra consultation");
    }

    if (analysis.complexity === "very_complex") {
      notes.push("Complex design may require multiple sessions");
    }

    if (analysis.estimatedHours > 6) {
      notes.push("Large piece - recommend consultation before booking");
    }

    return notes;
  }

  /**
   * Generate a pre-sketch based on references and artist style
   */
  async generatePreSketch(params: SketchParams): Promise<GeneratedSketch> {
    // Guard: require at least one reference URL
    if (!params.referenceUrls || params.referenceUrls.length === 0) {
      throw new Error("No reference images provided. Please upload at least one reference image.");
    }

    try {
      // First analyze the references
      const analysisPromises = params.referenceUrls.map((url) => this.analyzeReference(url));
      const analyses = await Promise.all(analysisPromises);

      // Combine analyses
      const combinedAnalysis: ReferenceAnalysis = {
        styles: [...new Set(analyses.flatMap((a) => a.styles))],
        elements: [...new Set(analyses.flatMap((a) => a.elements))],
        colors: [...new Set(analyses.flatMap((a) => a.colors))],
        complexity: analyses.reduce((max, a) => 
          this.getComplexityValue(a.complexity) > this.getComplexityValue(max) ? a.complexity : max,
          analyses[0].complexity
        ),
        estimatedHours: Math.max(...analyses.map((a) => a.estimatedHours)),
        placement_suggestions: [...new Set(analyses.flatMap((a) => a.placement_suggestions))],
        mood: analyses[0].mood,
        description: params.clientDescription || analyses[0].description,
      };

      // Match with portfolio
      const portfolioMatch = await this.matchWithPortfolio(
        combinedAnalysis,
        params.artistId,
        params.workspaceId
      );

      // Generate sketch via edge function
      const { data, error } = await supabase.functions.invoke("sketch-gen-studio", {
        body: {
          referenceUrls: params.referenceUrls,
          description: params.clientDescription,
          style: params.preferredStyle || combinedAnalysis.styles[0],
          placement: params.placement,
          size: params.size,
          artistId: params.artistId,
        },
      });

      if (error) throw error;

      // Save to database
      const { data: savedSketch, error: saveError } = await supabase
        .from("ai_design_suggestions")
        .insert({
          user_prompt: params.clientDescription,
          reference_images: params.referenceUrls,
          generated_image_url: data.sketchUrl,
          ai_description: data.description,
          style_preferences: combinedAnalysis.styles,
          suggested_placement: params.placement,
          estimated_duration_minutes: combinedAnalysis.estimatedHours * 60,
        })
        .select("id")
        .single();

      return {
        id: savedSketch?.id || crypto.randomUUID(),
        imageUrl: data.sketchUrl,
        thumbnailUrl: data.thumbnailUrl,
        analysis: combinedAnalysis,
        portfolioMatch,
        aiDescription: data.description || "AI-generated sketch based on your references",
        iterations: 1,
        createdAt: new Date(),
      };
    } catch (err) {
      console.error("Failed to generate sketch:", err);
      throw new Error("Could not generate sketch. Please try again.");
    }
  }

  private getComplexityValue(complexity: ReferenceAnalysis["complexity"]): number {
    const values = { simple: 1, moderate: 2, complex: 3, very_complex: 4 };
    return values[complexity] || 2;
  }

  /**
   * Prepare a sketch for AR preview
   */
  async prepareForAR(sketch: GeneratedSketch): Promise<ARReadyAsset> {
    try {
      const { data, error } = await supabase.functions.invoke("ar-tattoo-engine", {
        body: {
          action: "prepare_asset",
          imageUrl: sketch.imageUrl,
          placements: sketch.analysis.placement_suggestions,
        },
      });

      if (error) throw error;

      return {
        sketchId: sketch.id,
        originalUrl: sketch.imageUrl,
        transparentUrl: data.transparentUrl || sketch.imageUrl,
        suggestedPlacements: sketch.analysis.placement_suggestions,
        scaleFactor: data.scaleFactor || 1,
      };
    } catch (err) {
      console.error("Failed to prepare AR asset:", err);
      // Return basic asset on error
      return {
        sketchId: sketch.id,
        originalUrl: sketch.imageUrl,
        transparentUrl: sketch.imageUrl,
        suggestedPlacements: sketch.analysis.placement_suggestions,
        scaleFactor: 1,
      };
    }
  }

  /**
   * Full pipeline: analyze → match → generate → prepare for AR
   */
  async fullDesignPipeline(params: SketchParams): Promise<{
    sketch: GeneratedSketch;
    arAsset: ARReadyAsset;
  }> {
    const sketch = await this.generatePreSketch(params);
    const arAsset = await this.prepareForAR(sketch);
    return { sketch, arAsset };
  }

  /**
   * Unified analysis using the Design Orchestrator
   * Calls Vision Stack + Style DNA + Feasibility Lab in parallel
   */
  async analyzeUpload(
    sessionId: string,
    imageUrl: string,
    workspaceId: string,
    artistId?: string
  ): Promise<FullAnalysisResult> {
    try {
      const { data, error } = await supabase.functions.invoke("design-orchestrator", {
        body: {
          action: "analyze_upload",
          session_id: sessionId,
          image_url: imageUrl,
          workspace_id: workspaceId,
          artist_id: artistId,
        },
      });

      if (error) throw error;
      return data.analysis as FullAnalysisResult;
    } catch (err) {
      console.error("Failed to analyze upload:", err);
      // Return defaults on error
      return {
        visionStack: { quality: { score: 0.8, issues: [] }, bodyPart: { detected: 'forearm', confidence: 0.7 }, existingTattoo: { present: false } },
        styleDna: { tokens: [], matchScore: 0.75, similarPortfolio: [] },
        feasibility: { score: 0.85, factors: [], risks: [], recommendation: 'Proceed with design' }
      };
    }
  }

  /**
   * Track conversion event via orchestrator
   */
  async trackInteraction(sessionId: string, eventName: string, metadata?: Record<string, unknown>) {
    try {
      await supabase.functions.invoke("design-orchestrator", {
        body: {
          action: "track_interaction",
          session_id: sessionId,
          event_name: eventName,
          metadata
        },
      });
    } catch (err) {
      console.error("Failed to track interaction:", err);
    }
  }
}

// Export singleton instance
export const DesignEngine = DesignEngineInternalService.getInstance();
export default DesignEngine;
