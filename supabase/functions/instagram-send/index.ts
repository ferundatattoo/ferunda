import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// ============================================================================
// INSTAGRAM SEND - Send DMs and publish content via Graph API
// ============================================================================

interface SendMessageRequest {
  action: 'send_dm' | 'publish_post' | 'publish_story';
  recipientId?: string;
  message?: string;
  imageUrl?: string;
  caption?: string;
  videoUrl?: string;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const request: SendMessageRequest = await req.json();
    
    const INSTAGRAM_ACCESS_TOKEN = Deno.env.get('INSTAGRAM_ACCESS_TOKEN');
    const INSTAGRAM_ACCOUNT_ID = Deno.env.get('INSTAGRAM_ACCOUNT_ID');
    const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
    const SUPABASE_SERVICE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

    if (!INSTAGRAM_ACCESS_TOKEN) {
      console.log('[Instagram Send] No access token configured - using mock mode');
      return new Response(JSON.stringify({
        success: true,
        mock: true,
        message: 'Instagram integration pending - message queued for manual review'
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    switch (request.action) {
      case 'send_dm': {
        if (!request.recipientId || !request.message) {
          throw new Error('recipientId and message are required');
        }

        // Send DM via Instagram Graph API
        const response = await fetch(
          `https://graph.facebook.com/v18.0/${INSTAGRAM_ACCOUNT_ID}/messages`,
          {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${INSTAGRAM_ACCESS_TOKEN}`,
              'Content-Type': 'application/json'
            },
            body: JSON.stringify({
              recipient: { id: request.recipientId },
              message: { text: request.message }
            })
          }
        );

        const result = await response.json();

        if (!response.ok) {
          console.error('[Instagram Send] API Error:', result);
          throw new Error(result.error?.message || 'Failed to send DM');
        }

        // Log outbound message
        await supabase.from('omnichannel_messages').insert({
          channel: 'instagram',
          direction: 'outbound',
          recipient_id: request.recipientId,
          content: request.message,
          external_id: result.message_id,
          status: 'sent',
          metadata: { api_response: result }
        });

        console.log('[Instagram Send] DM sent successfully:', result.message_id);

        return new Response(JSON.stringify({
          success: true,
          messageId: result.message_id
        }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }

      case 'publish_post': {
        if (!request.imageUrl) {
          throw new Error('imageUrl is required for posts');
        }

        // Step 1: Create media container
        const containerResponse = await fetch(
          `https://graph.facebook.com/v18.0/${INSTAGRAM_ACCOUNT_ID}/media`,
          {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${INSTAGRAM_ACCESS_TOKEN}`,
              'Content-Type': 'application/json'
            },
            body: JSON.stringify({
              image_url: request.imageUrl,
              caption: request.caption || ''
            })
          }
        );

        const container = await containerResponse.json();

        if (!containerResponse.ok) {
          throw new Error(container.error?.message || 'Failed to create media container');
        }

        // Step 2: Publish the container
        const publishResponse = await fetch(
          `https://graph.facebook.com/v18.0/${INSTAGRAM_ACCOUNT_ID}/media_publish`,
          {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${INSTAGRAM_ACCESS_TOKEN}`,
              'Content-Type': 'application/json'
            },
            body: JSON.stringify({
              creation_id: container.id
            })
          }
        );

        const published = await publishResponse.json();

        if (!publishResponse.ok) {
          throw new Error(published.error?.message || 'Failed to publish media');
        }

        console.log('[Instagram Send] Post published:', published.id);

        return new Response(JSON.stringify({
          success: true,
          postId: published.id,
          containerId: container.id
        }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }

      case 'publish_story': {
        // Stories use similar flow but with different media type
        const mediaType = request.videoUrl ? 'VIDEO' : 'IMAGE';
        const mediaUrl = request.videoUrl || request.imageUrl;

        if (!mediaUrl) {
          throw new Error('imageUrl or videoUrl is required for stories');
        }

        const containerResponse = await fetch(
          `https://graph.facebook.com/v18.0/${INSTAGRAM_ACCOUNT_ID}/media`,
          {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${INSTAGRAM_ACCESS_TOKEN}`,
              'Content-Type': 'application/json'
            },
            body: JSON.stringify({
              media_type: 'STORIES',
              [mediaType === 'VIDEO' ? 'video_url' : 'image_url']: mediaUrl
            })
          }
        );

        const container = await containerResponse.json();

        if (!containerResponse.ok) {
          throw new Error(container.error?.message || 'Failed to create story container');
        }

        // Publish story
        const publishResponse = await fetch(
          `https://graph.facebook.com/v18.0/${INSTAGRAM_ACCOUNT_ID}/media_publish`,
          {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${INSTAGRAM_ACCESS_TOKEN}`,
              'Content-Type': 'application/json'
            },
            body: JSON.stringify({
              creation_id: container.id
            })
          }
        );

        const published = await publishResponse.json();

        console.log('[Instagram Send] Story published:', published.id);

        return new Response(JSON.stringify({
          success: true,
          storyId: published.id
        }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }

      default:
        throw new Error(`Unknown action: ${request.action}`);
    }

  } catch (error) {
    console.error('[Instagram Send] Error:', error);
    return new Response(JSON.stringify({
      success: false,
      error: String(error)
    }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
});
