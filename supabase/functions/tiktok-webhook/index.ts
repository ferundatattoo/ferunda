import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// ============================================================================
// TIKTOK WEBHOOK v2.0 - AI-Powered Comments + Trend Detection + Analytics
// ============================================================================

// Trend detection patterns for tattoo content
const TREND_PATTERNS = {
  styles: {
    micro_realism: /micro.?real|pequeño.?realism|tiny.?detail/i,
    geometric: /geometr|sacred.?geometry|mandala|pattern/i,
    fine_line: /fine.?line|linea.?fina|thin.?line|delicate/i,
    minimal: /minimal|minimalista|simple|clean/i,
    botanical: /floral|flower|plant|botanical|rosa|leaf/i,
    portrait: /portrait|retrato|face|cara/i
  },
  placements: {
    forearm: /forearm|antebrazo|arm/i,
    hand: /hand|mano|finger|dedo/i,
    neck: /neck|cuello|behind.?ear/i,
    chest: /chest|pecho|sternum/i,
    back: /back|espalda|spine/i,
    leg: /leg|pierna|thigh|muslo|calf/i
  },
  sentiments: {
    positive: /love|amazing|incredible|beautiful|hermoso|perfecto|fire|🔥|❤️|😍|💯/i,
    curious: /how|como|cómo|what|que|qué|where|donde|price|precio|\?/i,
    booking_intent: /book|reserv|cita|appointment|disponible|available|want|quiero/i,
    negative: /bad|mal|ugly|feo|hate|odio|terrible/i
  }
};

function detectTrends(text: string): { styles: string[]; placements: string[]; sentiment: string; bookingIntent: boolean } {
  const styles: string[] = [];
  const placements: string[] = [];
  let sentiment = 'neutral';
  let bookingIntent = false;

  // Detect styles
  for (const [style, pattern] of Object.entries(TREND_PATTERNS.styles)) {
    if (pattern.test(text)) styles.push(style);
  }

  // Detect placements
  for (const [placement, pattern] of Object.entries(TREND_PATTERNS.placements)) {
    if (pattern.test(text)) placements.push(placement);
  }

  // Detect sentiment
  if (TREND_PATTERNS.sentiments.positive.test(text)) sentiment = 'positive';
  else if (TREND_PATTERNS.sentiments.negative.test(text)) sentiment = 'negative';
  else if (TREND_PATTERNS.sentiments.curious.test(text)) sentiment = 'curious';

  // Detect booking intent
  bookingIntent = TREND_PATTERNS.sentiments.booking_intent.test(text);

  return { styles, placements, sentiment, bookingIntent };
}

function detectLanguage(text: string): 'es' | 'en' {
  const spanishPatterns = /\b(hola|que|qué|cómo|cuánto|donde|dónde|quiero|quisiera|tatuaje|gracias|por favor|hermoso|increíble)\b/i;
  return spanishPatterns.test(text) ? 'es' : 'en';
}

// Quick AI response templates
const COMMENT_RESPONSES: Record<string, { es: string; en: string }> = {
  positive: {
    es: "¡Gracias! 🖤 Si te interesa algo similar, escríbeme por DM",
    en: "Thank you! 🖤 If you want something similar, DM me"
  },
  curious: {
    es: "¡Buena pregunta! Escríbeme por DM y te cuento más 📩",
    en: "Great question! DM me for details 📩"
  },
  booking_intent: {
    es: "¡Genial! 🔥 Envíame DM con tu idea y agendamos. Link en bio para citas 📅",
    en: "Awesome! 🔥 DM me your idea and let's book. Link in bio for appointments 📅"
  }
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  const url = new URL(req.url);
  const VERIFY_TOKEN = Deno.env.get('TIKTOK_VERIFY_TOKEN') || 'ferunda_tiktok_verify_2026';

  // GET - Webhook verification
  if (req.method === 'GET') {
    const challenge = url.searchParams.get('challenge');
    const verifyToken = url.searchParams.get('verify_token');

    if (verifyToken === VERIFY_TOKEN && challenge) {
      console.log('[TikTok Webhook v2] Verification successful');
      return new Response(challenge, { status: 200, headers: { 'Content-Type': 'text/plain' } });
    }
    return new Response('Verification failed', { status: 403 });
  }

  // POST - Incoming events
  if (req.method === 'POST') {
    try {
      const body = await req.json();
      console.log('[TikTok Webhook v2] Event:', JSON.stringify(body).substring(0, 300));

      const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
      const SUPABASE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
      const TIKTOK_ACCESS_TOKEN = Deno.env.get('TIKTOK_ACCESS_TOKEN');
      const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
      
      const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

      const eventType = body.event || body.type;
      
      switch (eventType) {
        case 'comment.create':
        case 'video.comment': {
          const comment = body.data || body.comment;
          const videoId = comment?.video_id;
          const userId = comment?.user_id;
          const username = comment?.username;
          const text = comment?.text;
          const commentId = comment?.comment_id;

          if (!text) break;

          console.log(`[TikTok Webhook v2] Comment on ${videoId}: ${text.substring(0, 80)}`);

          // Analyze comment for trends
          const trends = detectTrends(text);
          const language = detectLanguage(text);
          
          console.log(`[TikTok Webhook v2] Trends: styles=${trends.styles.join(',')}, sentiment=${trends.sentiment}, booking=${trends.bookingIntent}`);

          // Store in omnichannel
          await supabase.from('omnichannel_messages').insert({
            channel: 'tiktok',
            direction: 'inbound',
            sender_id: userId,
            content: text,
            external_id: commentId,
            status: 'unread',
            metadata: {
              platform: 'tiktok',
              video_id: videoId,
              username,
              event_type: 'comment',
              trends,
              language
            }
          });

          // Update trend aggregation in social_trends
          if (trends.styles.length > 0 || trends.placements.length > 0) {
            for (const style of trends.styles) {
              try {
                // Try RPC first
                const { error: rpcError } = await supabase.rpc('increment_trend_count', {
                  p_topic: style,
                  p_platform: 'tiktok',
                  p_category: 'style'
                });
                
                if (rpcError) {
                  // Fallback: upsert manually
                  await supabase.from('social_trends').upsert({
                    topic: style,
                    platform: 'tiktok',
                    category: 'style',
                    mention_count: 1,
                    sentiment_score: trends.sentiment === 'positive' ? 0.8 : trends.sentiment === 'negative' ? 0.2 : 0.5,
                    detected_at: new Date().toISOString()
                  }, { onConflict: 'topic,platform' });
                }
              } catch (trendError) {
                console.log('[TikTok Webhook v2] Trend update skipped:', trendError);
              }
            }
          }

          // High-priority: booking intent
          if (trends.bookingIntent) {
            console.log('[TikTok Webhook v2] Booking intent detected!');
            
            await supabase.from('booking_requests').insert({
              source: 'tiktok',
              status: 'new',
              route: 'artist',
              service_type: 'consultation',
              brief: {
                source: 'tiktok_comment',
                video_id: videoId,
                comment_text: text,
                user_id: userId,
                username,
                detected_styles: trends.styles,
                detected_placements: trends.placements,
                booking_intent: true,
                language
              }
            });
          }

          // Auto-reply to comments (if enabled and has booking intent or positive sentiment)
          if (TIKTOK_ACCESS_TOKEN && (trends.bookingIntent || trends.sentiment === 'positive')) {
            let replyText = trends.bookingIntent 
              ? COMMENT_RESPONSES.booking_intent[language]
              : COMMENT_RESPONSES.positive[language];

            // Enhance with AI for unique replies (optional)
            if (LOVABLE_API_KEY && trends.bookingIntent) {
              try {
                const aiResponse = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
                  method: 'POST',
                  headers: {
                    'Authorization': `Bearer ${LOVABLE_API_KEY}`,
                    'Content-Type': 'application/json'
                  },
                  body: JSON.stringify({
                    model: 'openai/gpt-5-nano',
                    messages: [
                      { 
                        role: 'system', 
                        content: `Genera una respuesta CORTA (max 100 caracteres) para TikTok. Artista de tatuajes, micro-realismo. Idioma: ${language === 'es' ? 'español' : 'inglés'}. Incluye emoji. Invita a DM.`
                      },
                      { role: 'user', content: `Comentario: "${text}"` }
                    ],
                    max_completion_tokens: 50
                  })
                });

                if (aiResponse.ok) {
                  const aiData = await aiResponse.json();
                  const aiReply = aiData.choices?.[0]?.message?.content;
                  if (aiReply && aiReply.length <= 150) {
                    replyText = aiReply;
                  }
                }
              } catch (e) {
                console.log('[TikTok Webhook v2] AI reply fallback');
              }
            }

            console.log(`[TikTok Webhook v2] Auto-reply: ${replyText}`);

            // Note: TikTok API comment reply endpoint
            // This is a placeholder - actual implementation depends on TikTok API version
            try {
              const replyResponse = await fetch(
                `https://open.tiktokapis.com/v2/comment/reply/`,
                {
                  method: 'POST',
                  headers: {
                    'Authorization': `Bearer ${TIKTOK_ACCESS_TOKEN}`,
                    'Content-Type': 'application/json'
                  },
                  body: JSON.stringify({
                    video_id: videoId,
                    comment_id: commentId,
                    text: replyText
                  })
                }
              );

              if (replyResponse.ok) {
                console.log('[TikTok Webhook v2] Reply sent');
                
                // Store outbound
                await supabase.from('omnichannel_messages').insert({
                  channel: 'tiktok',
                  direction: 'outbound',
                  sender_id: 'ferunda_bot',
                  recipient_id: userId,
                  content: replyText,
                  status: 'sent',
                  metadata: { 
                    ai_generated: true,
                    reply_to_comment: commentId,
                    video_id: videoId
                  }
                });
              }
            } catch (replyError) {
              console.log('[TikTok Webhook v2] Reply not sent (API may not be configured)');
            }
          }

          // ============================================================
          // CORE BUS: Publish event to ferunda-core-bus channel
          // ============================================================
          try {
            const channel = supabase.channel('ferunda-core-bus');
            await channel.send({
              type: 'broadcast',
              event: 'core_event',
              payload: {
                type: 'bus:webhook_tiktok',
                data: { 
                  senderId: userId, 
                  content: text, 
                  eventType: 'comment',
                  videoId,
                  commentId,
                  trends,
                  language
                },
                source: 'webhook',
                timestamp: new Date().toISOString(),
              },
            });
            await supabase.removeChannel(channel);
            console.log('[TikTok Webhook v2] 📡 Published to Core Bus');
          } catch (busErr) {
            console.warn('[TikTok Webhook v2] Core Bus publish failed:', busErr);
          }
          break;
        }

        case 'video.stats_update':
        case 'analytics.update': {
          const stats = body.data || body.stats;
          const videoId = stats?.video_id;
          
          if (!videoId || !stats) break;

          console.log(`[TikTok Webhook v2] Analytics for video ${videoId}:`, 
            `views=${stats.views}, likes=${stats.likes}, comments=${stats.comments}`);

          // Link to AI avatar video if exists
          const { data: avatarVideo } = await supabase
            .from('ai_avatar_videos')
            .select('id')
            .or(`metadata->>tiktok_video_id.eq.${videoId},synthesia_video_id.eq.${videoId}`)
            .single();

          if (avatarVideo) {
            const engagementRate = stats.views > 0 
              ? ((stats.likes || 0) + (stats.comments || 0) + (stats.shares || 0)) / stats.views 
              : 0;

            await supabase.from('avatar_video_analytics').insert({
              video_id: avatarVideo.id,
              platform: 'tiktok',
              watch_duration_seconds: stats.avg_watch_time || 0,
              completion_rate: stats.completion_rate || 0,
              converted: engagementRate > 0.1, // Consider high engagement as soft conversion
              created_at: new Date().toISOString()
            });

            await supabase
              .from('ai_avatar_videos')
              .update({
                views_count: stats.views || 0,
                engagement_score: engagementRate,
                conversion_impact: engagementRate > 0.05 ? engagementRate * 10 : null
              })
              .eq('id', avatarVideo.id);

            console.log(`[TikTok Webhook v2] Updated avatar video analytics, engagement=${(engagementRate * 100).toFixed(2)}%`);
          }
          break;
        }

        case 'message.create':
        case 'dm.received': {
          const message = body.data || body.message;
          const senderId = message?.sender_id;
          const text = message?.text;
          const messageId = message?.message_id;

          if (!text) break;

          console.log(`[TikTok Webhook v2] DM from ${senderId}: ${text.substring(0, 80)}`);

          const trends = detectTrends(text);
          const language = detectLanguage(text);

          await supabase.from('omnichannel_messages').insert({
            channel: 'tiktok',
            direction: 'inbound',
            sender_id: senderId,
            content: text,
            external_id: messageId,
            status: 'unread',
            metadata: {
              platform: 'tiktok',
              event_type: 'dm',
              trends,
              language
            }
          });

          // Use full concierge for DMs
          try {
            await supabase.functions.invoke('ferunda-agent', {
              body: {
                message: text,
                channel: 'tiktok',
                senderId,
                autoReply: true,
                context: { trends, language }
              }
            });
          } catch (agentError) {
            console.error('[TikTok Webhook v2] Agent error:', agentError);
          }
          break;
        }

        case 'video.publish_complete': {
          // Track when our uploaded videos are published
          const videoData = body.data || body.video;
          const videoId = videoData?.video_id;
          
          console.log(`[TikTok Webhook v2] Video published: ${videoId}`);
          
          // Could link this to campaign tracking
          break;
        }

        default:
          console.log(`[TikTok Webhook v2] Unhandled event: ${eventType}`);
      }

      return new Response(JSON.stringify({ received: true }), {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });

    } catch (error) {
      console.error('[TikTok Webhook v2] Error:', error);
      return new Response(JSON.stringify({ error: 'Processing error' }), {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }
  }

  return new Response('Method not allowed', { status: 405 });
});
