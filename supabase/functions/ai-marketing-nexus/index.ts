import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Platform-specific content templates
const platformTemplates = {
  instagram: {
    maxLength: 2200,
    hashtagLimit: 30,
    format: "visual-first",
    emojiDensity: "high"
  },
  twitter: {
    maxLength: 280,
    hashtagLimit: 3,
    format: "concise",
    emojiDensity: "medium"
  },
  linkedin: {
    maxLength: 3000,
    hashtagLimit: 5,
    format: "professional",
    emojiDensity: "low"
  },
  facebook: {
    maxLength: 63206,
    hashtagLimit: 10,
    format: "conversational",
    emojiDensity: "medium"
  },
  tiktok: {
    maxLength: 2200,
    hashtagLimit: 5,
    format: "trendy",
    emojiDensity: "high"
  }
};

// Tone configurations
const toneConfigs = {
  professional: { style: "formal", vocabulary: "industry-specific", enthusiasm: "moderate" },
  casual: { style: "relaxed", vocabulary: "everyday", enthusiasm: "friendly" },
  playful: { style: "fun", vocabulary: "creative", enthusiasm: "high" },
  urgent: { style: "direct", vocabulary: "action-oriented", enthusiasm: "intense" },
  educational: { style: "informative", vocabulary: "explanatory", enthusiasm: "helpful" }
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const { action, payload } = await req.json();
    console.log(`[ai-marketing-nexus] Action: ${action}`, JSON.stringify(payload).slice(0, 200));

    let result;

    switch (action) {
      case 'generate_content':
        result = await generateContent(supabase, payload);
        break;
      case 'analyze_trends':
        result = await analyzeTrends(supabase, payload);
        break;
      case 'schedule_post':
        result = await schedulePost(supabase, payload);
        break;
      case 'generate_hashtags':
        result = await generateHashtags(payload);
        break;
      case 'competitor_analysis':
        result = await analyzeCompetitor(supabase, payload);
        break;
      case 'sentiment_analysis':
        result = await analyzeSentiment(payload);
        break;
      case 'ab_test_create':
        result = await createABTest(supabase, payload);
        break;
      case 'get_optimal_times':
        result = await getOptimalPostingTimes(supabase, payload);
        break;
      case 'workflow_execute':
        result = await executeWorkflow(supabase, payload);
        break;
      default:
        throw new Error(`Unknown action: ${action}`);
    }

    // Log to audit
    await supabase.from('marketing_audit_log').insert({
      workspace_id: payload.workspace_id,
      action_type: action,
      entity_type: 'marketing',
      entity_id: result?.id || null,
      changes_json: { action, payload_summary: Object.keys(payload) },
      performed_by: payload.user_id || null
    });

    return new Response(JSON.stringify({ success: true, data: result }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });

  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error('[ai-marketing-nexus] Error:', errorMessage);
    return new Response(JSON.stringify({ success: false, error: errorMessage }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
});

// Generate content with AI
async function generateContent(supabase: any, payload: {
  prompt: string;
  platform: string;
  tone: string;
  workspace_id?: string;
  include_hashtags?: boolean;
  include_cta?: boolean;
}) {
  const { prompt, platform, tone, include_hashtags = true, include_cta = true } = payload;
  
  const platformConfig = platformTemplates[platform as keyof typeof platformTemplates] || platformTemplates.instagram;
  const toneConfig = toneConfigs[tone as keyof typeof toneConfigs] || toneConfigs.casual;

  // Build AI prompt
  const systemPrompt = `You are an expert social media content creator. Generate content for ${platform} with these specifications:
- Tone: ${toneConfig.style}, ${toneConfig.enthusiasm} enthusiasm
- Max length: ${platformConfig.maxLength} characters
- Emoji density: ${platformConfig.emojiDensity}
- Format: ${platformConfig.format}
${include_hashtags ? `- Include up to ${platformConfig.hashtagLimit} relevant hashtags` : '- No hashtags'}
${include_cta ? '- Include a clear call-to-action' : ''}

Respond with ONLY the post content, nothing else.`;

  const openaiKey = Deno.env.get('OPENAI_API_KEY');
  
  if (!openaiKey) {
    // Fallback: generate template-based content
    return generateTemplateContent(prompt, platform, tone, platformConfig);
  }

  const response = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${openaiKey}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      model: 'gpt-4o-mini',
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: prompt }
      ],
      max_tokens: 500,
      temperature: 0.8
    })
  });

  const data = await response.json();
  const content = data.choices?.[0]?.message?.content || generateTemplateContent(prompt, platform, tone, platformConfig).content;

  return {
    content,
    platform,
    tone,
    character_count: content.length,
    max_length: platformConfig.maxLength,
    hashtag_count: (content.match(/#\w+/g) || []).length
  };
}

function generateTemplateContent(prompt: string, platform: string, tone: string, config: any) {
  const templates = {
    professional: `${prompt}\n\nDiscover how this can transform your approach. Link in bio for more details.`,
    casual: `Hey! ${prompt} 🙌\n\nWhat do you think? Drop your thoughts below! 👇`,
    playful: `✨ ${prompt} ✨\n\nThis is giving us ALL the vibes! Who else feels this? 🙋‍♀️`,
    urgent: `🚨 ${prompt}\n\nDon't miss out - act now before it's too late!`,
    educational: `Did you know? ${prompt}\n\n💡 Share this with someone who needs to see it!`
  };

  const content = templates[tone as keyof typeof templates] || templates.casual;
  
  return {
    content: content.slice(0, config.maxLength),
    platform,
    tone,
    character_count: content.length,
    max_length: config.maxLength,
    hashtag_count: 0
  };
}

// Analyze trends
async function analyzeTrends(supabase: any, payload: {
  topic?: string;
  platform?: string;
  workspace_id?: string;
}) {
  const { topic, platform } = payload;
  
  // Simulated trend analysis - in production would use social APIs
  const trends = [
    { name: topic || "Tattoo Art", score: 92, change: 15, volume: "2.4M", sentiment: "positive", hashtags: ["#tattooart", "#inked", "#tattoodesign"] },
    { name: "Minimal Tattoos", score: 88, change: 23, volume: "1.8M", sentiment: "positive", hashtags: ["#minimaltattoo", "#finetattoo"] },
    { name: "Color Realism", score: 76, change: -5, volume: "890K", sentiment: "neutral", hashtags: ["#colortattoo", "#realistictattoo"] },
    { name: "Japanese Style", score: 71, change: 8, volume: "1.2M", sentiment: "positive", hashtags: ["#japanesetattoo", "#irezumi"] },
    { name: "Geometric Designs", score: 65, change: 12, volume: "750K", sentiment: "positive", hashtags: ["#geometrictattoo", "#linework"] }
  ];

  return {
    trends,
    analyzed_at: new Date().toISOString(),
    platform: platform || "all",
    recommendations: [
      "Focus on minimal tattoo content - trending up 23%",
      "Consider Japanese style posts for stable engagement",
      "Geometric designs are gaining traction"
    ]
  };
}

// Schedule a post
async function schedulePost(supabase: any, payload: {
  workspace_id: string;
  content: string;
  platform: string;
  scheduled_for: string;
  media_urls?: string[];
  hashtags?: string[];
}) {
  const { workspace_id, content, platform, scheduled_for, media_urls, hashtags } = payload;

  const { data, error } = await supabase
    .from('marketing_scheduled_posts')
    .insert({
      workspace_id,
      content,
      platform,
      scheduled_for,
      media_urls: media_urls || [],
      hashtags: hashtags || [],
      status: 'scheduled'
    })
    .select()
    .single();

  if (error) throw error;
  return data;
}

// Generate hashtags
async function generateHashtags(payload: {
  topic: string;
  platform?: string;
  count?: number;
}) {
  const { topic, platform = 'instagram', count = 15 } = payload;
  
  // Simulated hashtag generation - would use AI/API in production
  const baseHashtags = topic.toLowerCase().split(' ').map(w => `#${w}`);
  
  const relatedHashtags = [
    { tag: `#${topic.replace(/\s+/g, '')}`, reach: "2.4M", competition: "high", relevance: 95 },
    { tag: `#${topic.replace(/\s+/g, '')}art`, reach: "890K", competition: "medium", relevance: 88 },
    { tag: `#${topic.replace(/\s+/g, '')}design`, reach: "1.2M", competition: "medium", relevance: 85 },
    { tag: `#${topic.replace(/\s+/g, '')}style`, reach: "650K", competition: "low", relevance: 80 },
    { tag: `#${topic.replace(/\s+/g, '')}inspiration`, reach: "1.5M", competition: "high", relevance: 78 },
    { tag: "#creative", reach: "45M", competition: "very high", relevance: 60 },
    { tag: "#art", reach: "120M", competition: "very high", relevance: 55 },
    { tag: "#design", reach: "80M", competition: "very high", relevance: 50 },
    { tag: "#artwork", reach: "35M", competition: "high", relevance: 65 },
    { tag: "#artist", reach: "55M", competition: "very high", relevance: 58 }
  ];

  return {
    hashtags: relatedHashtags.slice(0, count),
    topic,
    platform,
    total_potential_reach: "250M+",
    recommended_mix: "3 high competition, 5 medium, 7 low for optimal reach"
  };
}

// Analyze competitor
async function analyzeCompetitor(supabase: any, payload: {
  competitor_handle: string;
  platform: string;
  workspace_id?: string;
}) {
  const { competitor_handle, platform, workspace_id } = payload;

  // Simulated competitor analysis
  const analysis = {
    handle: competitor_handle,
    platform,
    followers: Math.floor(Math.random() * 100000) + 10000,
    engagement_rate: (Math.random() * 5 + 1).toFixed(2) + "%",
    posting_frequency: Math.floor(Math.random() * 3) + 1 + " posts/day",
    top_hashtags: ["#tattoo", "#ink", "#tattooed", "#tattooartist", "#inked"],
    content_types: {
      images: 65,
      videos: 25,
      reels: 10
    },
    peak_posting_times: ["10:00 AM", "2:00 PM", "7:00 PM"],
    sentiment: "positive",
    strengths: ["Consistent posting", "High-quality visuals", "Strong community engagement"],
    weaknesses: ["Limited video content", "Inconsistent hashtag strategy"],
    opportunities: ["Expand into Reels", "Collaborate with micro-influencers"]
  };

  // Store analysis
  if (workspace_id) {
    await supabase.from('marketing_competitor_analysis').insert({
      workspace_id,
      competitor_handle,
      platform,
      analysis_data: analysis
    });
  }

  return analysis;
}

// Analyze sentiment
async function analyzeSentiment(payload: {
  text: string;
}) {
  const { text } = payload;
  
  // Simple sentiment analysis - would use AI in production
  const positiveWords = ['love', 'amazing', 'great', 'awesome', 'beautiful', 'excellent', 'fantastic', 'wonderful'];
  const negativeWords = ['hate', 'bad', 'terrible', 'awful', 'horrible', 'poor', 'disappointing'];
  
  const words = text.toLowerCase().split(/\s+/);
  const positiveCount = words.filter(w => positiveWords.some(pw => w.includes(pw))).length;
  const negativeCount = words.filter(w => negativeWords.some(nw => w.includes(nw))).length;
  
  let sentiment = 'neutral';
  let score = 0.5;
  
  if (positiveCount > negativeCount) {
    sentiment = 'positive';
    score = 0.5 + (positiveCount / words.length);
  } else if (negativeCount > positiveCount) {
    sentiment = 'negative';
    score = 0.5 - (negativeCount / words.length);
  }

  return {
    sentiment,
    score: Math.min(1, Math.max(0, score)).toFixed(2),
    positive_indicators: positiveCount,
    negative_indicators: negativeCount,
    word_count: words.length
  };
}

// Create A/B Test
async function createABTest(supabase: any, payload: {
  workspace_id: string;
  name: string;
  variants: Array<{ name: string; content: string }>;
  platform: string;
  duration_days?: number;
}) {
  const { workspace_id, name, variants, platform, duration_days = 7 } = payload;

  const end_date = new Date();
  end_date.setDate(end_date.getDate() + duration_days);

  const { data, error } = await supabase
    .from('marketing_ab_tests')
    .insert({
      workspace_id,
      test_name: name,
      variants_json: variants.map((v, i) => ({
        id: `variant_${i}`,
        name: v.name,
        content: v.content,
        impressions: 0,
        clicks: 0,
        conversions: 0
      })),
      platform,
      status: 'active',
      start_date: new Date().toISOString(),
      end_date: end_date.toISOString()
    })
    .select()
    .single();

  if (error) throw error;
  return data;
}

// Get optimal posting times
async function getOptimalPostingTimes(supabase: any, payload: {
  workspace_id: string;
  platform: string;
}) {
  const { workspace_id, platform } = payload;

  // Check for stored schedules
  const { data: schedules } = await supabase
    .from('marketing_posting_schedules')
    .select('*')
    .eq('workspace_id', workspace_id)
    .eq('platform', platform)
    .single();

  if (schedules) {
    return schedules;
  }

  // Default optimal times by platform
  const defaultTimes = {
    instagram: { weekday: ["11:00", "14:00", "19:00"], weekend: ["10:00", "13:00", "20:00"] },
    twitter: { weekday: ["08:00", "12:00", "17:00"], weekend: ["09:00", "14:00", "18:00"] },
    linkedin: { weekday: ["07:30", "12:00", "17:30"], weekend: ["10:00", "14:00"] },
    facebook: { weekday: ["09:00", "13:00", "16:00"], weekend: ["12:00", "15:00", "19:00"] },
    tiktok: { weekday: ["07:00", "12:00", "19:00", "22:00"], weekend: ["11:00", "19:00", "22:00"] }
  };

  return {
    platform,
    optimal_times: defaultTimes[platform as keyof typeof defaultTimes] || defaultTimes.instagram,
    timezone: "America/Chicago",
    based_on: "industry averages"
  };
}

// Execute durable workflow
async function executeWorkflow(supabase: any, payload: {
  workspace_id: string;
  workflow_type: string;
  steps: Array<{ action: string; params: any }>;
}) {
  const { workspace_id, workflow_type, steps } = payload;
  
  const results = [];
  
  for (const step of steps) {
    try {
      console.log(`[Workflow] Executing step: ${step.action}`);
      
      // Execute each step based on action type
      let stepResult;
      switch (step.action) {
        case 'generate_content':
          stepResult = await generateContent(supabase, { ...step.params, workspace_id });
          break;
        case 'generate_hashtags':
          stepResult = await generateHashtags(step.params);
          break;
        case 'schedule_post':
          stepResult = await schedulePost(supabase, { ...step.params, workspace_id });
          break;
        default:
          stepResult = { status: 'skipped', reason: 'Unknown action' };
      }
      
      results.push({ action: step.action, status: 'success', result: stepResult });
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      results.push({ action: step.action, status: 'failed', error: errorMessage });
    }
  }

  return {
    workflow_type,
    executed_at: new Date().toISOString(),
    steps_completed: results.filter(r => r.status === 'success').length,
    total_steps: steps.length,
    results
  };
}
