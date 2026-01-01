import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// ============================================================================
// INSTAGRAM WEBHOOK - Receive DMs and process with AI Agent
// ============================================================================

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  const url = new URL(req.url);
  const VERIFY_TOKEN = Deno.env.get('INSTAGRAM_VERIFY_TOKEN') || 'ferunda_verify_token_2026';

  // GET - Webhook verification (required by Meta)
  if (req.method === 'GET') {
    const mode = url.searchParams.get('hub.mode');
    const token = url.searchParams.get('hub.verify_token');
    const challenge = url.searchParams.get('hub.challenge');

    if (mode === 'subscribe' && token === VERIFY_TOKEN) {
      console.log('[Instagram Webhook] Verification successful');
      return new Response(challenge, { 
        status: 200, 
        headers: { 'Content-Type': 'text/plain' } 
      });
    }

    return new Response('Verification failed', { status: 403 });
  }

  // POST - Incoming messages
  if (req.method === 'POST') {
    try {
      const body = await req.json();
      console.log('[Instagram Webhook] Received event:', JSON.stringify(body).substring(0, 500));

      const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
      const SUPABASE_SERVICE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
      const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

      // Process Instagram messaging events
      if (body.object === 'instagram') {
        for (const entry of body.entry || []) {
          for (const messaging of entry.messaging || []) {
            const senderId = messaging.sender?.id;
            const messageText = messaging.message?.text;
            const messageId = messaging.message?.mid;
            const timestamp = messaging.timestamp;

            if (!senderId || !messageText) continue;

            console.log(`[Instagram Webhook] Message from ${senderId}: ${messageText.substring(0, 100)}`);

            // Store in omnichannel_messages
            const { data: messageData, error: insertError } = await supabase
              .from('omnichannel_messages')
              .insert({
                channel: 'instagram',
                direction: 'inbound',
                sender_id: senderId,
                content: messageText,
                external_id: messageId,
                status: 'unread',
                metadata: {
                  platform: 'instagram',
                  timestamp,
                  raw_event: messaging
                }
              })
              .select()
              .single();

            if (insertError) {
              console.error('[Instagram Webhook] Error storing message:', insertError);
              continue;
            }

            // Trigger AI agent for response (async, don't wait)
            try {
              await supabase.functions.invoke('studio-concierge', {
                body: {
                  message: messageText,
                  channel: 'instagram',
                  senderId,
                  messageId: messageData?.id,
                  autoReply: true
                }
              });
            } catch (agentError) {
              console.error('[Instagram Webhook] Agent trigger error:', agentError);
            }
          }
        }
      }

      // Instagram requires 200 OK quickly
      return new Response(JSON.stringify({ received: true }), {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });

    } catch (error) {
      console.error('[Instagram Webhook] Error:', error);
      // Still return 200 to prevent Meta from retrying
      return new Response(JSON.stringify({ error: 'Processing error' }), {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }
  }

  return new Response('Method not allowed', { status: 405 });
});
