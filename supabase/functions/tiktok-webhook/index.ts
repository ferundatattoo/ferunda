import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// ============================================================================
// TIKTOK WEBHOOK - Receive comments, analytics and process notifications
// ============================================================================

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
      console.log('[TikTok Webhook] Verification successful');
      return new Response(challenge, { 
        status: 200, 
        headers: { 'Content-Type': 'text/plain' } 
      });
    }

    return new Response('Verification failed', { status: 403 });
  }

  // POST - Incoming events
  if (req.method === 'POST') {
    try {
      const body = await req.json();
      console.log('[TikTok Webhook] Received event:', JSON.stringify(body).substring(0, 500));

      const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
      const SUPABASE_SERVICE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
      const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

      const eventType = body.event || body.type;
      
      switch (eventType) {
        case 'comment.create':
        case 'video.comment': {
          // New comment on a video
          const comment = body.data || body.comment;
          const videoId = comment?.video_id;
          const userId = comment?.user_id;
          const text = comment?.text;
          const commentId = comment?.comment_id;

          if (!text) break;

          console.log(`[TikTok Webhook] Comment on video ${videoId}: ${text.substring(0, 100)}`);

          // Store comment
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
              event_type: 'comment',
              raw_event: body
            }
          });

          // Check if comment mentions booking interest
          const bookingKeywords = ['book', 'appointment', 'price', 'cost', 'how much', 'disponible', 'cita', 'precio'];
          const hasBookingIntent = bookingKeywords.some(kw => text.toLowerCase().includes(kw));

          if (hasBookingIntent) {
            console.log('[TikTok Webhook] Booking intent detected, flagging for follow-up');
            
            // Flag for high-priority follow-up
            await supabase.from('booking_requests').insert({
              workspace_id: body.workspace_id || null,
              source: 'tiktok',
              status: 'new',
              client_email: null,
              service_type: 'consultation',
              brief: {
                source: 'tiktok_comment',
                video_id: videoId,
                comment_text: text,
                user_id: userId,
                booking_intent: true
              }
            });
          }
          break;
        }

        case 'video.stats_update':
        case 'analytics.update': {
          // Video analytics update
          const stats = body.data || body.stats;
          const videoId = stats?.video_id;
          
          if (!videoId || !stats) break;

          console.log(`[TikTok Webhook] Analytics update for video ${videoId}`);

          // Update avatar_video_analytics if this is an AI video
          const { data: avatarVideo } = await supabase
            .from('ai_avatar_videos')
            .select('id')
            .eq('metadata->>tiktok_video_id', videoId)
            .single();

          if (avatarVideo) {
            await supabase.from('avatar_video_analytics').insert({
              video_id: avatarVideo.id,
              platform: 'tiktok',
              watch_duration_seconds: stats.avg_watch_time || 0,
              completion_rate: stats.completion_rate || 0,
              converted: false,
              created_at: new Date().toISOString()
            });

            // Update video record with latest stats
            await supabase
              .from('ai_avatar_videos')
              .update({
                views_count: stats.views || 0,
                engagement_score: (stats.likes + stats.comments + stats.shares) / (stats.views || 1)
              })
              .eq('id', avatarVideo.id);
          }
          break;
        }

        case 'message.create':
        case 'dm.received': {
          // Direct message (if Business API supports it)
          const message = body.data || body.message;
          const senderId = message?.sender_id;
          const text = message?.text;
          const messageId = message?.message_id;

          if (!text) break;

          console.log(`[TikTok Webhook] DM from ${senderId}: ${text.substring(0, 100)}`);

          // Store in omnichannel
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
              raw_event: body
            }
          });

          // Trigger concierge for response
          await supabase.functions.invoke('studio-concierge', {
            body: {
              message: text,
              channel: 'tiktok',
              senderId,
              autoReply: true
            }
          });
          break;
        }

        default:
          console.log(`[TikTok Webhook] Unhandled event type: ${eventType}`);
      }

      return new Response(JSON.stringify({ received: true }), {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });

    } catch (error) {
      console.error('[TikTok Webhook] Error:', error);
      return new Response(JSON.stringify({ error: 'Processing error' }), {
        status: 200, // Return 200 to prevent retries
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }
  }

  return new Response('Method not allowed', { status: 405 });
});
