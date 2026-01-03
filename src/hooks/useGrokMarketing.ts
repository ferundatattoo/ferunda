/**
 * useGrokMarketing - Hook for Grok-powered marketing content generation
 * 
 * Provides:
 * - Social media caption generation
 * - Campaign ideas
 * - Content calendar suggestions
 * - Hashtag optimization
 * - Engagement predictions
 */

import { useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';

export interface GeneratedCaption {
  id: string;
  content: string;
  platform: 'instagram' | 'tiktok' | 'twitter' | 'facebook';
  tone: string;
  engagementPrediction: number;
  bestTime: string;
  hashtags: string[];
}

export interface CampaignIdea {
  id: string;
  name: string;
  description: string;
  targetAudience: string;
  estimatedReach: number;
  contentTypes: string[];
  duration: string;
  budget?: string;
}

export interface ContentCalendarItem {
  date: string;
  platform: string;
  contentType: string;
  topic: string;
  caption?: string;
  status: 'planned' | 'draft' | 'scheduled';
}

export interface MarketingInsight {
  type: 'trend' | 'opportunity' | 'tip';
  title: string;
  description: string;
  relevance: number;
}

interface GrokMarketingResult {
  captions?: GeneratedCaption[];
  campaigns?: CampaignIdea[];
  calendar?: ContentCalendarItem[];
  insights?: MarketingInsight[];
  raw?: string;
}

export function useGrokMarketing() {
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastResult, setLastResult] = useState<GrokMarketingResult | null>(null);

  /**
   * Generate social media captions with Grok AI
   */
  const generateCaptions = useCallback(async (params: {
    topic: string;
    platform: 'instagram' | 'tiktok' | 'twitter' | 'facebook';
    tone: 'professional' | 'casual' | 'artistic' | 'mystical' | 'bold' | 'minimalist';
    language?: 'en' | 'es';
    variations?: number;
  }): Promise<GeneratedCaption[]> => {
    setIsGenerating(true);
    setError(null);

    const variations = params.variations || 3;
    const lang = params.language || 'es';

    try {
      const prompt = `Generate ${variations} unique ${params.platform} captions for a tattoo studio.

Topic: ${params.topic}
Tone: ${params.tone}
Language: ${lang === 'es' ? 'Spanish' : 'English'}
Platform: ${params.platform}

Respond with a JSON array:
[{
  "content": "the caption text with emojis",
  "hashtags": ["relevant", "hashtags", "without #"],
  "engagementPrediction": 0-100,
  "bestTime": "optimal posting time range"
}]

Make captions engaging, platform-appropriate (${params.platform === 'twitter' ? 'max 280 chars' : 'max 2200 chars'}), and tattoo-industry focused.
Include relevant emojis. Hashtags should mix popular and niche tags.`;

      // Use unified AI Router
      const { data, error: fnError } = await supabase.functions.invoke('ai-router', {
        body: {
          type: 'marketing',
          messages: [{ role: 'user', content: prompt }],
          stream: false,
        },
      });

      if (fnError || !data?.success) throw fnError || new Error(data?.error);

      const content = data?.content || '';
      const jsonMatch = content.match(/\[[\s\S]*\]/);
      
      if (jsonMatch) {
        const parsed = JSON.parse(jsonMatch[0]);
        const captions: GeneratedCaption[] = parsed.map((c: any, i: number) => ({
          id: `caption-${Date.now()}-${i}`,
          content: c.content,
          platform: params.platform,
          tone: params.tone,
          engagementPrediction: c.engagementPrediction || 75 + Math.random() * 20,
          bestTime: c.bestTime || '18:00 - 21:00',
          hashtags: c.hashtags || [],
        }));
        
        setLastResult(prev => ({ ...prev, captions }));
        return captions;
      }

      return generateMockCaptions(params);
    } catch (err) {
      console.error('[GrokMarketing] Caption error:', err);
      setError('Failed to generate captions');
      return generateMockCaptions(params);
    } finally {
      setIsGenerating(false);
    }
  }, []);

  /**
   * Generate campaign ideas
   */
  const generateCampaignIdeas = useCallback(async (params: {
    goal: 'awareness' | 'engagement' | 'bookings' | 'followers';
    budget?: 'low' | 'medium' | 'high';
    duration?: string;
    season?: string;
  }): Promise<CampaignIdea[]> => {
    setIsGenerating(true);
    setError(null);

    try {
      const prompt = `Generate 3 marketing campaign ideas for a tattoo studio.

Goal: ${params.goal}
Budget: ${params.budget || 'medium'}
Duration: ${params.duration || '1 month'}
${params.season ? `Season/Theme: ${params.season}` : ''}

Respond with a JSON array:
[{
  "name": "campaign name",
  "description": "detailed description",
  "targetAudience": "who to target",
  "estimatedReach": number,
  "contentTypes": ["reels", "stories", "posts", etc],
  "duration": "suggested duration",
  "budget": "estimated budget range"
}]

Be creative and specific to the tattoo industry. Include seasonal/trend elements.`;

      // Use unified AI Router
      const { data, error: fnError } = await supabase.functions.invoke('ai-router', {
        body: {
          type: 'marketing',
          messages: [{ role: 'user', content: prompt }],
          stream: false,
        },
      });

      if (fnError || !data?.success) throw fnError || new Error(data?.error);

      const content = data?.content || '';
      const jsonMatch = content.match(/\[[\s\S]*\]/);
      
      if (jsonMatch) {
        const campaigns: CampaignIdea[] = JSON.parse(jsonMatch[0]).map((c: any, i: number) => ({
          id: `campaign-${Date.now()}-${i}`,
          ...c,
        }));
        
        setLastResult(prev => ({ ...prev, campaigns }));
        return campaigns;
      }

      return [];
    } catch (err) {
      console.error('[GrokMarketing] Campaign error:', err);
      setError('Failed to generate campaigns');
      return [];
    } finally {
      setIsGenerating(false);
    }
  }, []);

  /**
   * Generate content calendar suggestions
   */
  const generateContentCalendar = useCallback(async (params: {
    weeks: number;
    platforms: string[];
    postsPerWeek: number;
    themes?: string[];
  }): Promise<ContentCalendarItem[]> => {
    setIsGenerating(true);
    setError(null);

    try {
      const prompt = `Create a ${params.weeks}-week content calendar for a tattoo studio.

Platforms: ${params.platforms.join(', ')}
Posts per week: ${params.postsPerWeek}
${params.themes?.length ? `Themes to include: ${params.themes.join(', ')}` : ''}

Respond with a JSON array of content items:
[{
  "date": "YYYY-MM-DD",
  "platform": "platform name",
  "contentType": "reel|story|post|carousel",
  "topic": "content topic/idea",
  "caption": "short caption preview"
}]

Mix content types. Include:
- New work showcases
- Behind the scenes
- Client stories
- Educational content
- Promotional content
- Interactive content (polls, Q&A)`;

      // Use unified AI Router
      const { data, error: fnError } = await supabase.functions.invoke('ai-router', {
        body: {
          type: 'marketing',
          messages: [{ role: 'user', content: prompt }],
          stream: false,
        },
      });

      if (fnError || !data?.success) throw fnError || new Error(data?.error);

      const content = data?.content || '';
      const jsonMatch = content.match(/\[[\s\S]*\]/);
      
      if (jsonMatch) {
        const calendar: ContentCalendarItem[] = JSON.parse(jsonMatch[0]).map((item: any) => ({
          ...item,
          status: 'planned' as const,
        }));
        
        setLastResult(prev => ({ ...prev, calendar }));
        return calendar;
      }

      return [];
    } catch (err) {
      console.error('[GrokMarketing] Calendar error:', err);
      setError('Failed to generate calendar');
      return [];
    } finally {
      setIsGenerating(false);
    }
  }, []);

  /**
   * Get hashtag suggestions
   */
  const getHashtags = useCallback(async (params: {
    topic: string;
    platform: string;
    count?: number;
  }): Promise<string[]> => {
    setIsGenerating(true);
    setError(null);

    try {
      const prompt = `Generate ${params.count || 20} optimized hashtags for a tattoo studio post about: ${params.topic}

Platform: ${params.platform}

Return ONLY a JSON array of hashtags (without the # symbol):
["hashtag1", "hashtag2", ...]

Mix:
- 30% high-volume popular tags (100K+ posts)
- 40% medium-volume niche tags (10K-100K posts)
- 30% specific/unique tags

Focus on tattoo industry. Include location-neutral tags.`;

      // Use unified AI Router
      const { data, error: fnError } = await supabase.functions.invoke('ai-router', {
        body: {
          type: 'marketing',
          messages: [{ role: 'user', content: prompt }],
          stream: false,
        },
      });

      if (fnError || !data?.success) throw fnError || new Error(data?.error);

      const content = data?.content || '';
      const jsonMatch = content.match(/\[[\s\S]*\]/);
      
      if (jsonMatch) {
        return JSON.parse(jsonMatch[0]);
      }

      return getDefaultHashtags();
    } catch (err) {
      console.error('[GrokMarketing] Hashtags error:', err);
      setError('Failed to generate hashtags');
      return getDefaultHashtags();
    } finally {
      setIsGenerating(false);
    }
  }, []);

  /**
   * Analyze and improve existing content
   */
  const improveContent = useCallback(async (params: {
    content: string;
    platform: string;
    goal?: 'engagement' | 'conversions' | 'reach';
  }): Promise<{ improved: string; suggestions: string[] }> => {
    setIsGenerating(true);
    setError(null);

    try {
      const prompt = `Improve this ${params.platform} post for a tattoo studio:

Original: "${params.content}"

Goal: ${params.goal || 'engagement'}

Respond with JSON:
{
  "improved": "the improved version",
  "suggestions": ["specific improvement 1", "suggestion 2", ...]
}

Keep the core message. Enhance with:
- Better hooks
- Stronger CTAs
- Optimized length for ${params.platform}
- Relevant emojis`;

      // Use unified AI Router
      const { data, error: fnError } = await supabase.functions.invoke('ai-router', {
        body: {
          type: 'marketing',
          messages: [{ role: 'user', content: prompt }],
          stream: false,
        },
      });

      if (fnError || !data?.success) throw fnError || new Error(data?.error);

      const content = data?.content || '';
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      
      if (jsonMatch) {
        return JSON.parse(jsonMatch[0]);
      }

      return { improved: params.content, suggestions: [] };
    } catch (err) {
      console.error('[GrokMarketing] Improve error:', err);
      setError('Failed to improve content');
      return { improved: params.content, suggestions: [] };
    } finally {
      setIsGenerating(false);
    }
  }, []);

  return {
    isGenerating,
    error,
    lastResult,
    generateCaptions,
    generateCampaignIdeas,
    generateContentCalendar,
    getHashtags,
    improveContent,
  };
}

// Helper functions
function generateMockCaptions(params: {
  topic: string;
  platform: string;
  tone: string;
}): GeneratedCaption[] {
  const templates = [
    {
      content: `✨ Arte que cuenta historias en la piel\n\n${params.topic}\n\n¿Qué historia quieres contar?`,
      hashtags: ['tattoo', 'tattooart', 'inked', 'tattoodesign'],
    },
    {
      content: `🖤 Cuando el arte se convierte en parte de ti\n\n${params.topic}\n\nGracias por confiar en mi visión.`,
      hashtags: ['blackwork', 'finelinetattoo', 'minimalisttattoo'],
    },
    {
      content: `⚡ ${params.topic}\n\nCada línea tiene un propósito, cada sombra una intención.\n\nDM para consultas 📩`,
      hashtags: ['tattooartist', 'inkstagram', 'tattooideas'],
    },
  ];

  return templates.map((t, i) => ({
    id: `mock-${Date.now()}-${i}`,
    content: t.content,
    platform: params.platform as any,
    tone: params.tone,
    engagementPrediction: 75 + Math.random() * 20,
    bestTime: '18:00 - 21:00',
    hashtags: t.hashtags,
  }));
}

function getDefaultHashtags(): string[] {
  return [
    'tattoo', 'tattooart', 'inked', 'tattoodesign', 'ink',
    'tattooed', 'tattooartist', 'tattoos', 'tattooinspiration',
    'tattoolife', 'blackwork', 'finelinetattoo', 'minimalisttattoo',
    'geometrictattoo', 'dotwork', 'blackworktattoo', 'tattoolovers',
    'tattoostyle', 'inkstagram', 'tattoomodel'
  ];
}

export default useGrokMarketing;
