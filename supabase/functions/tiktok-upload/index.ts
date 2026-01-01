import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// ============================================================================
// TIKTOK UPLOAD - Upload videos via TikTok Content Posting API
// ============================================================================

interface UploadRequest {
  action: 'upload_video' | 'check_status' | 'get_analytics';
  videoUrl?: string;
  title?: string;
  description?: string;
  hashtags?: string[];
  videoId?: string;
  avatarVideoId?: string;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const request: UploadRequest = await req.json();
    
    const TIKTOK_ACCESS_TOKEN = Deno.env.get('TIKTOK_ACCESS_TOKEN');
    const TIKTOK_OPEN_ID = Deno.env.get('TIKTOK_OPEN_ID');
    const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
    const SUPABASE_SERVICE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

    if (!TIKTOK_ACCESS_TOKEN) {
      console.log('[TikTok Upload] No access token configured - using mock mode');
      return new Response(JSON.stringify({
        success: true,
        mock: true,
        message: 'TikTok integration pending - video queued for manual upload'
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    switch (request.action) {
      case 'upload_video': {
        if (!request.videoUrl) {
          throw new Error('videoUrl is required');
        }

        console.log('[TikTok Upload] Initiating video upload...');

        // Build caption with hashtags
        const hashtags = request.hashtags?.map(h => h.startsWith('#') ? h : `#${h}`).join(' ') || '';
        const caption = `${request.description || ''} ${hashtags}`.trim();

        // Step 1: Initialize upload (Pull from URL method)
        const initResponse = await fetch(
          'https://open.tiktokapis.com/v2/post/publish/video/init/',
          {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${TIKTOK_ACCESS_TOKEN}`,
              'Content-Type': 'application/json; charset=UTF-8'
            },
            body: JSON.stringify({
              post_info: {
                title: request.title || 'New Video',
                privacy_level: 'PUBLIC_TO_EVERYONE',
                disable_duet: false,
                disable_stitch: false,
                disable_comment: false,
                video_cover_timestamp_ms: 1000
              },
              source_info: {
                source: 'PULL_FROM_URL',
                video_url: request.videoUrl
              }
            })
          }
        );

        const initResult = await initResponse.json();

        if (initResult.error?.code) {
          console.error('[TikTok Upload] Init error:', initResult.error);
          throw new Error(initResult.error.message || 'Failed to initialize upload');
        }

        const publishId = initResult.data?.publish_id;
        console.log('[TikTok Upload] Upload initiated, publish_id:', publishId);

        // Store reference in database
        if (request.avatarVideoId) {
          await supabase
            .from('ai_avatar_videos')
            .update({
              metadata: {
                tiktok_publish_id: publishId,
                tiktok_upload_status: 'processing',
                tiktok_caption: caption
              }
            })
            .eq('id', request.avatarVideoId);
        }

        return new Response(JSON.stringify({
          success: true,
          publishId,
          status: 'processing',
          message: 'Video upload initiated. Check status with check_status action.'
        }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }

      case 'check_status': {
        if (!request.videoId) {
          throw new Error('videoId (publish_id) is required');
        }

        // Check publish status
        const statusResponse = await fetch(
          `https://open.tiktokapis.com/v2/post/publish/status/fetch/`,
          {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${TIKTOK_ACCESS_TOKEN}`,
              'Content-Type': 'application/json'
            },
            body: JSON.stringify({
              publish_id: request.videoId
            })
          }
        );

        const statusResult = await statusResponse.json();

        if (statusResult.error?.code) {
          throw new Error(statusResult.error.message || 'Failed to check status');
        }

        const status = statusResult.data?.status;
        const publicUrl = statusResult.data?.publicaly_available_post_id?.[0];

        console.log('[TikTok Upload] Status check:', status, publicUrl);

        // Update database if completed
        if (status === 'PUBLISH_COMPLETE' && request.avatarVideoId) {
          await supabase
            .from('ai_avatar_videos')
            .update({
              metadata: {
                tiktok_video_id: publicUrl,
                tiktok_upload_status: 'published',
                tiktok_published_at: new Date().toISOString()
              }
            })
            .eq('id', request.avatarVideoId);
        }

        return new Response(JSON.stringify({
          success: true,
          status,
          videoId: publicUrl,
          fullResponse: statusResult.data
        }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }

      case 'get_analytics': {
        if (!request.videoId) {
          throw new Error('videoId is required');
        }

        // Fetch video analytics
        const analyticsResponse = await fetch(
          `https://open.tiktokapis.com/v2/video/query/?fields=id,create_time,cover_image_url,share_url,video_description,duration,height,width,title,embed_html,embed_link,like_count,comment_count,share_count,view_count`,
          {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${TIKTOK_ACCESS_TOKEN}`,
              'Content-Type': 'application/json'
            },
            body: JSON.stringify({
              filters: {
                video_ids: [request.videoId]
              }
            })
          }
        );

        const analyticsResult = await analyticsResponse.json();

        if (analyticsResult.error?.code) {
          throw new Error(analyticsResult.error.message || 'Failed to fetch analytics');
        }

        const video = analyticsResult.data?.videos?.[0];

        if (video && request.avatarVideoId) {
          // Store analytics
          await supabase.from('avatar_video_analytics').insert({
            video_id: request.avatarVideoId,
            platform: 'tiktok',
            watch_duration_seconds: video.duration || 0,
            completion_rate: 0, // Not directly available
            converted: false,
            created_at: new Date().toISOString()
          });

          // Update video record
          await supabase
            .from('ai_avatar_videos')
            .update({
              views_count: video.view_count || 0,
              engagement_score: (video.like_count + video.comment_count + video.share_count) / (video.view_count || 1)
            })
            .eq('id', request.avatarVideoId);
        }

        return new Response(JSON.stringify({
          success: true,
          analytics: {
            views: video?.view_count || 0,
            likes: video?.like_count || 0,
            comments: video?.comment_count || 0,
            shares: video?.share_count || 0,
            duration: video?.duration || 0
          }
        }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }

      default:
        throw new Error(`Unknown action: ${request.action}`);
    }

  } catch (error) {
    console.error('[TikTok Upload] Error:', error);
    return new Response(JSON.stringify({
      success: false,
      error: String(error)
    }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
});
