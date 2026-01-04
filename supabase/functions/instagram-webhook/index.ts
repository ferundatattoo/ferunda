import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// ============================================================================
// INSTAGRAM WEBHOOK v2.0 - AI-Powered DM Handler with Intent Detection
// ============================================================================

// Quick intent detection for fast routing
const INTENT_PATTERNS = {
  booking: /\b(book|reserv|cita|appoint|schedule|agendar|cuando|when|available|disponible)\b/i,
  pricing: /\b(price|cost|cuanto|cuánto|how much|precio|rate|tarifa|cobr)\b/i,
  style: /\b(style|estilo|micro|realism|geometric|geometrico|fine.?line|portrait)\b/i,
  location: /\b(where|donde|city|ciudad|austin|houston|dallas|los.?angeles|guest.?spot)\b/i,
  portfolio: /\b(portfolio|work|trabajo|instagram|see|ver|ejemplos|examples)\b/i,
  healing: /\b(heal|curación|cuidado|aftercare|rojo|red|infected|infectado)\b/i,
  greeting: /\b(hi|hello|hola|hey|que tal|buenas|good morning|good afternoon)\b/i
};

function detectIntent(message: string): string[] {
  const intents: string[] = [];
  for (const [intent, pattern] of Object.entries(INTENT_PATTERNS)) {
    if (pattern.test(message)) {
      intents.push(intent);
    }
  }
  return intents.length > 0 ? intents : ['general'];
}

function detectLanguage(message: string): 'es' | 'en' {
  const spanishPatterns = /\b(hola|que|qué|cómo|cuánto|donde|dónde|quiero|quisiera|tatuaje|gracias|por favor)\b/i;
  return spanishPatterns.test(message) ? 'es' : 'en';
}

// Quick response templates for common intents
const QUICK_RESPONSES: Record<string, { es: string; en: string }> = {
  greeting: {
    es: "¡Hola! 👋 Soy el asistente de Ferunda. ¿En qué puedo ayudarte? Puedo hablar sobre estilos, disponibilidad, o ayudarte a agendar tu tatuaje.",
    en: "Hey! 👋 I'm Ferunda's assistant. How can I help? I can talk about styles, availability, or help you book your tattoo."
  },
  booking: {
    es: "Para agendar, necesito saber: 1) Qué idea tienes en mente, 2) Tamaño aproximado, 3) Zona del cuerpo. ¿Me compartes eso? 📝",
    en: "To book, I need to know: 1) Your idea, 2) Approximate size, 3) Body placement. Can you share that? 📝"
  },
  pricing: {
    es: "Los precios dependen del tamaño y complejidad. Tatuajes pequeños desde $300, medianos $500-800. ¿Tienes una idea específica? Te doy un estimado.",
    en: "Prices depend on size and complexity. Small tattoos from $300, medium $500-800. Do you have a specific idea? I'll give you an estimate."
  },
  portfolio: {
    es: "¡Claro! Puedes ver mi trabajo en @ferunda.tattoo 🖤 Especializado en micro-realismo geométrico. ¿Hay algún estilo que te interese?",
    en: "Sure! Check my work at @ferunda.tattoo 🖤 Specialized in geometric micro-realism. Any style you're interested in?"
  }
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  const url = new URL(req.url);
  const VERIFY_TOKEN = Deno.env.get('INSTAGRAM_VERIFY_TOKEN') || 'ferunda_verify_token_2026';

  // GET - Webhook verification
  if (req.method === 'GET') {
    const mode = url.searchParams.get('hub.mode');
    const token = url.searchParams.get('hub.verify_token');
    const challenge = url.searchParams.get('hub.challenge');

    if (mode === 'subscribe' && token === VERIFY_TOKEN) {
      console.log('[Instagram Webhook] Verification successful');
      return new Response(challenge, { status: 200, headers: { 'Content-Type': 'text/plain' } });
    }
    return new Response('Verification failed', { status: 403 });
  }

  // POST - Incoming messages
  if (req.method === 'POST') {
    try {
      const body = await req.json();
      console.log('[Instagram Webhook v2] Received:', JSON.stringify(body).substring(0, 300));

      const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
      const SUPABASE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
      const INSTAGRAM_ACCESS_TOKEN = Deno.env.get('INSTAGRAM_ACCESS_TOKEN');
      const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
      
      const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

      if (body.object === 'instagram') {
        for (const entry of body.entry || []) {
          for (const messaging of entry.messaging || []) {
            const senderId = messaging.sender?.id;
            const messageText = messaging.message?.text;
            const messageId = messaging.message?.mid;
            const attachments = messaging.message?.attachments;
            const timestamp = messaging.timestamp;

            if (!senderId) continue;

            // Handle image attachments
            let imageUrl: string | null = null;
            if (attachments?.length > 0) {
              const imageAttachment = attachments.find((a: any) => a.type === 'image');
              if (imageAttachment) {
                imageUrl = imageAttachment.payload?.url;
                console.log('[Instagram Webhook] Image received:', imageUrl?.substring(0, 50));
              }
            }

            const content = messageText || (imageUrl ? '[Image received]' : '[Unknown content]');
            console.log(`[Instagram Webhook] From ${senderId}: ${content.substring(0, 80)}`);

            // Detect intent and language
            const intents = detectIntent(content);
            const language = detectLanguage(content);
            const primaryIntent = intents[0];
            
            console.log(`[Instagram Webhook] Intent: ${primaryIntent}, Language: ${language}`);

            // Store message
            const { data: msgData, error: insertError } = await supabase
              .from('omnichannel_messages')
              .insert({
                channel: 'instagram',
                direction: 'inbound',
                sender_id: senderId,
                content,
                external_id: messageId,
                status: 'unread',
                metadata: {
                  platform: 'instagram',
                  timestamp,
                  intents,
                  language,
                  has_image: !!imageUrl,
                  image_url: imageUrl
                }
              })
              .select()
              .single();

            if (insertError) {
              console.error('[Instagram Webhook] Insert error:', insertError);
              continue;
            }

            // Find or create conversation
            let conversationId: string | null = null;
            const { data: existingConvo } = await supabase
              .from('chat_conversations')
              .select('id')
              .eq('source', 'instagram')
              .eq('client_email', `instagram_${senderId}@dm.instagram.com`)
              .single();

            if (existingConvo) {
              conversationId = existingConvo.id;
            } else {
              const { data: newConvo } = await supabase
                .from('chat_conversations')
                .insert({
                  source: 'instagram',
                  client_email: `instagram_${senderId}@dm.instagram.com`,
                  status: 'active',
                  metadata: { sender_id: senderId, platform: 'instagram' }
                })
                .select()
                .single();
              conversationId = newConvo?.id;
            }

            // Generate AI response
            let responseText: string;
            
            // Use quick response for simple intents, AI for complex
            if (['greeting', 'portfolio'].includes(primaryIntent) && !imageUrl) {
              responseText = QUICK_RESPONSES[primaryIntent]?.[language] || QUICK_RESPONSES.greeting[language];
            } else {
              // Use full AI for complex queries or images
              try {
                if (LOVABLE_API_KEY) {
                  const systemPrompt = `Eres el asistente de Instagram de Ferunda Tattoo. 
Estilo: micro-realismo geométrico, solo negro/grises.
REGLAS:
- Respuestas CORTAS (2-3 oraciones máximo para DMs)
- Si hay imagen, comenta brevemente si es viable para el estilo
- Guía hacia booking si muestran interés
- Idioma: ${language === 'es' ? 'español' : 'inglés'}
- Tono: cálido pero profesional`;

                  const userMessage = imageUrl 
                    ? `[Cliente envió imagen: ${imageUrl}] ${content}`
                    : content;

                  const aiResponse = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
                    method: 'POST',
                    headers: {
                      'Authorization': `Bearer ${LOVABLE_API_KEY}`,
                      'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({
                      model: 'openai/gpt-5-mini',
                      messages: [
                        { role: 'system', content: systemPrompt },
                        { role: 'user', content: userMessage }
                      ],
                      max_completion_tokens: 150
                    })
                  });

                  if (aiResponse.ok) {
                    const aiData = await aiResponse.json();
                    responseText = aiData.choices?.[0]?.message?.content || QUICK_RESPONSES.greeting[language];
                  } else {
                    responseText = QUICK_RESPONSES[primaryIntent]?.[language] || QUICK_RESPONSES.greeting[language];
                  }
                } else {
                  responseText = QUICK_RESPONSES[primaryIntent]?.[language] || QUICK_RESPONSES.greeting[language];
                }
              } catch (aiError) {
                console.error('[Instagram Webhook] AI error:', aiError);
                responseText = QUICK_RESPONSES.greeting[language];
              }
            }

            console.log(`[Instagram Webhook] Responding: ${responseText.substring(0, 80)}...`);

            // Send response via Instagram API
            if (INSTAGRAM_ACCESS_TOKEN) {
              try {
                const sendResponse = await fetch(
                  `https://graph.facebook.com/v18.0/me/messages?access_token=${INSTAGRAM_ACCESS_TOKEN}`,
                  {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                      recipient: { id: senderId },
                      message: { text: responseText }
                    })
                  }
                );

                if (sendResponse.ok) {
                  console.log('[Instagram Webhook] Response sent successfully');
                  
                  // Store outbound message
                  await supabase.from('omnichannel_messages').insert({
                    channel: 'instagram',
                    direction: 'outbound',
                    sender_id: 'ferunda_bot',
                    recipient_id: senderId,
                    content: responseText,
                    status: 'sent',
                    metadata: { 
                      ai_generated: true, 
                      intent: primaryIntent,
                      conversation_id: conversationId 
                    }
                  });
                } else {
                  const errText = await sendResponse.text();
                  console.error('[Instagram Webhook] Send failed:', errText);
                }
              } catch (sendError) {
                console.error('[Instagram Webhook] Send error:', sendError);
              }
            } else {
              console.log('[Instagram Webhook] No access token, response not sent');
            }

            // Update conversation with last activity
            if (conversationId) {
              await supabase
                .from('chat_conversations')
                .update({ 
                  updated_at: new Date().toISOString(),
                  metadata: { 
                    last_intent: primaryIntent,
                    last_message_at: new Date().toISOString(),
                    sender_id: senderId
                  }
                })
                .eq('id', conversationId);
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
                  type: 'bus:webhook_instagram',
                  data: { 
                    senderId, 
                    content, 
                    intents, 
                    imageUrl,
                    language,
                    conversationId 
                  },
                  source: 'webhook',
                  timestamp: new Date().toISOString(),
                },
              });
              await supabase.removeChannel(channel);
              console.log('[Instagram Webhook] 📡 Published to Core Bus');
            } catch (busErr) {
              console.warn('[Instagram Webhook] Core Bus publish failed:', busErr);
            }
          }
        }
      }

      return new Response(JSON.stringify({ received: true }), {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });

    } catch (error) {
      console.error('[Instagram Webhook] Error:', error);
      return new Response(JSON.stringify({ error: 'Processing error' }), {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }
  }

  return new Response('Method not allowed', { status: 405 });
});
