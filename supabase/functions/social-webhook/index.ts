import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-hub-signature-256',
};

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY')!;

// Instagram Graph API integration
async function handleInstagramWebhook(body: any, supabase: any) {
  console.log('[SocialWebhook] Processing Instagram webhook:', JSON.stringify(body));
  
  const entry = body.entry?.[0];
  if (!entry?.messaging) return { processed: 0 };
  
  let processed = 0;
  
  for (const message of entry.messaging) {
    const senderId = message.sender?.id;
    const recipientId = message.recipient?.id;
    const messageData = message.message;
    
    if (!messageData) continue;
    
    // Find the channel
    const { data: channel } = await supabase
      .from('social_channels')
      .select('*')
      .eq('channel_type', 'instagram')
      .eq('account_id', recipientId)
      .single();
    
    if (!channel) {
      console.log('[SocialWebhook] No channel found for recipient:', recipientId);
      continue;
    }
    
    // Store the message
    const mediaUrls = messageData.attachments?.map((a: any) => a.payload?.url).filter(Boolean) || [];
    const hasImage = mediaUrls.some((url: string) => 
      url.includes('.jpg') || url.includes('.png') || url.includes('.jpeg') || url.includes('.webp')
    );
    
    const { data: storedMessage, error } = await supabase
      .from('social_messages')
      .insert({
        workspace_id: channel.workspace_id,
        channel_id: channel.id,
        external_id: messageData.mid,
        thread_id: senderId,
        sender_id: senderId,
        sender_name: message.sender?.username || `Instagram User`,
        message_type: hasImage ? 'image' : 'text',
        content: messageData.text || '',
        media_urls: mediaUrls,
        direction: 'inbound',
        status: 'pending',
        metadata: { raw: message }
      })
      .select()
      .single();
    
    if (error) {
      console.error('[SocialWebhook] Error storing message:', error);
      continue;
    }
    
    // Trigger Ferunda Agent for auto-response
    await processWithAgent(storedMessage, channel, supabase);
    processed++;
  }
  
  return { processed };
}

// TikTok Business API integration
async function handleTikTokWebhook(body: any, supabase: any) {
  console.log('[SocialWebhook] Processing TikTok webhook:', JSON.stringify(body));
  
  const event = body.event;
  if (!event) return { processed: 0 };
  
  const { data: channel } = await supabase
    .from('social_channels')
    .select('*')
    .eq('channel_type', 'tiktok')
    .single();
  
  if (!channel) {
    console.log('[SocialWebhook] No TikTok channel configured');
    return { processed: 0 };
  }
  
  if (event.event_type === 'receive_message') {
    const msgData = event.content;
    
    const { data: storedMessage } = await supabase
      .from('social_messages')
      .insert({
        workspace_id: channel.workspace_id,
        channel_id: channel.id,
        external_id: msgData.msg_id,
        thread_id: msgData.from_user_id,
        sender_id: msgData.from_user_id,
        sender_name: msgData.from_user_name || 'TikTok User',
        message_type: msgData.msg_type === 'video' ? 'video' : 'text',
        content: msgData.text || '',
        media_urls: msgData.video_url ? [msgData.video_url] : [],
        direction: 'inbound',
        status: 'pending',
        metadata: { raw: body }
      })
      .select()
      .single();
    
    if (storedMessage) {
      await processWithAgent(storedMessage, channel, supabase);
      return { processed: 1 };
    }
  }
  
  return { processed: 0 };
}

// Email webhook (from SendGrid/Gmail)
async function handleEmailWebhook(body: any, supabase: any) {
  console.log('[SocialWebhook] Processing email webhook:', JSON.stringify(body));
  
  const { data: channel } = await supabase
    .from('social_channels')
    .select('*')
    .eq('channel_type', 'email')
    .eq('is_active', true)
    .single();
  
  if (!channel) {
    console.log('[SocialWebhook] No email channel configured');
    return { processed: 0 };
  }
  
  // Handle SendGrid inbound parse or Gmail push notification
  const fromEmail = body.from || body.envelope?.from;
  const subject = body.subject || '';
  const textContent = body.text || body.plain || body.snippet || '';
  const htmlContent = body.html || '';
  
  // Extract attachments if any
  const attachments = body.attachments || [];
  const mediaUrls = attachments.map((a: any) => a.url || a.content_id).filter(Boolean);
  
  const { data: storedMessage } = await supabase
    .from('social_messages')
    .insert({
      workspace_id: channel.workspace_id,
      channel_id: channel.id,
      external_id: body.message_id || crypto.randomUUID(),
      thread_id: fromEmail,
      sender_id: fromEmail,
      sender_name: body.from_name || fromEmail,
      message_type: mediaUrls.length > 0 ? 'image' : 'text',
      content: `${subject}\n\n${textContent}`,
      media_urls: mediaUrls,
      direction: 'inbound',
      status: 'pending',
      metadata: { 
        subject,
        html: htmlContent,
        raw: body 
      }
    })
    .select()
    .single();
  
  if (storedMessage) {
    await processWithAgent(storedMessage, channel, supabase);
    return { processed: 1 };
  }
  
  return { processed: 0 };
}

// Process message with Ferunda Agent
async function processWithAgent(message: any, channel: any, supabase: any) {
  try {
    console.log('[SocialWebhook] Processing with Ferunda Agent:', message.id);
    
    // Build conversation context from thread
    const { data: threadMessages } = await supabase
      .from('social_messages')
      .select('*')
      .eq('thread_id', message.thread_id)
      .order('created_at', { ascending: true })
      .limit(10);
    
    const conversationHistory = (threadMessages || []).map((m: any) => ({
      role: m.direction === 'inbound' ? 'user' : 'assistant',
      content: m.content
    }));
    
    // Add current message
    conversationHistory.push({
      role: 'user',
      content: message.content
    });
    
    // Add image if present
    let imageUrl = null;
    if (message.media_urls?.length > 0) {
      imageUrl = message.media_urls[0];
    }
    
    // Call Ferunda Agent
    const agentResponse = await fetch(`${SUPABASE_URL}/functions/v1/ferunda-agent`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${Deno.env.get('SUPABASE_ANON_KEY')}`
      },
      body: JSON.stringify({
        messages: conversationHistory,
        imageUrl,
        memory: {
          source: channel.channel_type,
          externalId: message.external_id,
          senderName: message.sender_name
        }
      })
    });
    
    if (!agentResponse.ok) {
      throw new Error(`Agent error: ${agentResponse.status}`);
    }
    
    const agentData = await agentResponse.json();
    
    // Analyze sentiment and booking intent
    const sentimentScore = analyzeSentiment(message.content);
    const bookingIntent = analyzeBookingIntent(message.content + ' ' + agentData.message);
    const revenuePredict = predictRevenue(bookingIntent, message);
    
    // Update message with AI insights
    await supabase
      .from('social_messages')
      .update({
        agent_response: agentData.message,
        agent_confidence: 0.85,
        sentiment_score: sentimentScore,
        booking_intent_score: bookingIntent,
        revenue_prediction: revenuePredict,
        ai_insights: {
          toolsUsed: agentData.toolCalls?.map((t: any) => t.name) || [],
          attachments: agentData.attachments || [],
          reasoning: agentData.reasoning
        },
        status: bookingIntent > 0.7 ? 'pending' : 'agent_replied'
      })
      .eq('id', message.id);
    
    // Store for continual learning
    await supabase
      .from('agent_learning_data')
      .insert({
        workspace_id: channel.workspace_id,
        interaction_type: `social_${channel.channel_type}`,
        input_data: {
          content: message.content,
          mediaUrls: message.media_urls,
          senderName: message.sender_name
        },
        output_data: {
          response: agentData.message,
          tools: agentData.toolCalls,
          attachments: agentData.attachments
        },
        outcome: bookingIntent > 0.5 ? 'high_intent' : 'low_intent'
      });
    
    // Auto-send response if confidence is high and not escalated
    if (agentData.message && bookingIntent < 0.9) {
      await sendSocialResponse(channel, message, agentData.message, supabase);
    }
    
    console.log('[SocialWebhook] Agent processed successfully');
    
  } catch (error) {
    console.error('[SocialWebhook] Agent processing error:', error);
    
    // Mark for human review
    await supabase
      .from('social_messages')
      .update({
        status: 'escalated',
        escalation_reason: `Agent error: ${String(error)}`
      })
      .eq('id', message.id);
  }
}

// Send response back to social platform
async function sendSocialResponse(channel: any, originalMessage: any, responseText: string, supabase: any) {
  console.log('[SocialWebhook] Sending response to:', channel.channel_type);
  
  // Store outbound message
  await supabase
    .from('social_messages')
    .insert({
      workspace_id: channel.workspace_id,
      channel_id: channel.id,
      thread_id: originalMessage.thread_id,
      sender_id: channel.account_id,
      sender_name: channel.account_username || 'Ferunda',
      message_type: 'text',
      content: responseText,
      direction: 'outbound',
      status: 'agent_replied',
      metadata: { in_reply_to: originalMessage.id }
    });
  
  // TODO: Implement actual API calls when API keys are configured
  // For now, we just store the response for manual sending if needed
  
  if (channel.channel_type === 'instagram' && channel.access_token_encrypted) {
    // Instagram Graph API send
    console.log('[SocialWebhook] Would send to Instagram - API integration pending');
  } else if (channel.channel_type === 'tiktok' && channel.access_token_encrypted) {
    // TikTok Business API send
    console.log('[SocialWebhook] Would send to TikTok - API integration pending');
  } else if (channel.channel_type === 'email') {
    // Send via Resend/SendGrid
    const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY');
    if (RESEND_API_KEY && originalMessage.sender_id) {
      try {
        const emailResponse = await fetch('https://api.resend.com/emails', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${RESEND_API_KEY}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            from: 'Ferunda Tattoo <hello@ferunda.com>',
            to: originalMessage.sender_id,
            subject: 'Re: Your Tattoo Inquiry',
            html: `<p>${responseText.replace(/\n/g, '<br>')}</p><br><p>— Ferunda Tattoo</p>`
          })
        });
        console.log('[SocialWebhook] Email sent:', emailResponse.status);
      } catch (error) {
        console.error('[SocialWebhook] Email send error:', error);
      }
    }
  }
}

// Simple sentiment analysis
function analyzeSentiment(text: string): number {
  const positiveWords = ['love', 'great', 'amazing', 'excited', 'perfect', 'beautiful', 'awesome', 'encanta', 'genial', 'perfecto'];
  const negativeWords = ['hate', 'bad', 'terrible', 'awful', 'cancel', 'refund', 'angry', 'odio', 'mal', 'horrible'];
  
  const lowerText = text.toLowerCase();
  let score = 0.5;
  
  positiveWords.forEach(word => {
    if (lowerText.includes(word)) score += 0.1;
  });
  
  negativeWords.forEach(word => {
    if (lowerText.includes(word)) score -= 0.1;
  });
  
  return Math.max(0, Math.min(1, score));
}

// Analyze booking intent
function analyzeBookingIntent(text: string): number {
  const highIntentWords = ['book', 'appointment', 'schedule', 'deposit', 'price', 'cost', 'available', 'when', 'reservar', 'cita', 'precio', 'disponible', 'cuánto'];
  const mediumIntentWords = ['tattoo', 'design', 'idea', 'thinking', 'want', 'tatuaje', 'diseño', 'quiero'];
  
  const lowerText = text.toLowerCase();
  let score = 0.2;
  
  highIntentWords.forEach(word => {
    if (lowerText.includes(word)) score += 0.15;
  });
  
  mediumIntentWords.forEach(word => {
    if (lowerText.includes(word)) score += 0.05;
  });
  
  return Math.min(1, score);
}

// Predict potential revenue
function predictRevenue(bookingIntent: number, message: any): number {
  // Base session value
  const baseValue = 400;
  
  // Adjust based on intent
  const intentMultiplier = bookingIntent;
  
  // Check for size indicators
  const text = (message.content || '').toLowerCase();
  let sizeMultiplier = 1;
  
  if (text.includes('full') || text.includes('sleeve') || text.includes('back')) {
    sizeMultiplier = 3;
  } else if (text.includes('half') || text.includes('large')) {
    sizeMultiplier = 2;
  } else if (text.includes('small') || text.includes('tiny') || text.includes('pequeño')) {
    sizeMultiplier = 0.5;
  }
  
  return Math.round(baseValue * intentMultiplier * sizeMultiplier);
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const url = new URL(req.url);
    const platform = url.searchParams.get('platform') || 'instagram';
    
    // Instagram webhook verification
    if (req.method === 'GET') {
      const mode = url.searchParams.get('hub.mode');
      const token = url.searchParams.get('hub.verify_token');
      const challenge = url.searchParams.get('hub.challenge');
      
      // TODO: Store verify token in secrets
      if (mode === 'subscribe' && token === 'ferunda_verify_token') {
        console.log('[SocialWebhook] Webhook verified');
        return new Response(challenge, { status: 200 });
      }
      return new Response('Forbidden', { status: 403 });
    }

    const body = await req.json();
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
    
    let result;
    
    switch (platform) {
      case 'instagram':
        result = await handleInstagramWebhook(body, supabase);
        break;
      case 'tiktok':
        result = await handleTikTokWebhook(body, supabase);
        break;
      case 'email':
        result = await handleEmailWebhook(body, supabase);
        break;
      default:
        result = { error: 'Unknown platform' };
    }

    return new Response(JSON.stringify(result), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error('[SocialWebhook] Error:', error);
    return new Response(JSON.stringify({ error: String(error) }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
});
