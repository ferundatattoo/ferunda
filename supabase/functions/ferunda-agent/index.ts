import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const SYSTEM_PROMPT = `Eres Ferunda Agent, extensión inteligente del tatuador Ferunda Tattoo. Estilo exclusivo: micro-realismo y geométrico ultra-clean, líneas precisas, minimalismo elegante.

Tono: Profesional, calmado, educativo, empático. Nunca prometas lo imposible.

Flujo autónomo:
1. Saluda personalizado (usa memoria: 'Vi que tu último tatuaje fue geométrico en brazo – ¿continuamos esa línea?').
2. Pide detalles + fotos + zona exacta.
3. Auto-llama tools:
   - analysis_reference (siempre primero cuando hay imagen).
   - viability_simulator (si zona detectada).
   - generate_design_variations si match <80%.
4. Explica resultados visualmente: 'Aquí un video de cómo se distorsionaría en movimiento – riesgo medio en codo por flexión'.
5. Negocia: 'Para optimizar longevidad en tu piel clara, sugiero black & grey saturado – ¿te genero versión?'.
6. Decisiones:
   - Match alto + riesgo bajo → Propone slots + depósito Stripe directo.
   - Ajustes → Genera opciones y loop hasta aprobación.
   - No viable → Declina educado + recomienda alternativas.
7. Escala solo si: emoción alta, desacuerdo prolongado o diseño ultra-custom.
8. Siempre educa: explica riesgos técnicos sin alarmar.

Responde SIEMPRE en español. Sé conciso pero informativo.`;

const TOOLS = [
  {
    type: "function",
    function: {
      name: "analysis_reference",
      description: "Analiza una imagen de referencia para determinar estilo, viabilidad y características del tatuaje propuesto",
      parameters: {
        type: "object",
        properties: {
          image_url: { type: "string", description: "URL de la imagen a analizar" },
          body_part: { type: "string", description: "Zona del cuerpo donde irá el tatuaje" }
        },
        required: ["image_url"]
      }
    }
  },
  {
    type: "function", 
    function: {
      name: "viability_simulator",
      description: "Ejecuta simulación 3D de viabilidad del tatuaje incluyendo distorsión por movimiento y envejecimiento",
      parameters: {
        type: "object",
        properties: {
          reference_image_url: { type: "string" },
          body_part: { type: "string" },
          skin_tone: { type: "string", enum: ["light", "medium", "dark"] }
        },
        required: ["reference_image_url", "body_part"]
      }
    }
  },
  {
    type: "function",
    function: {
      name: "generate_design_variations",
      description: "Genera variaciones del diseño usando IA generativa",
      parameters: {
        type: "object",
        properties: {
          description: { type: "string", description: "Descripción del diseño deseado" },
          style: { type: "string", enum: ["micro-realism", "geometric", "fine-line", "blackwork"] },
          modifications: { type: "string", description: "Cambios específicos a aplicar" }
        },
        required: ["description"]
      }
    }
  },
  {
    type: "function",
    function: {
      name: "check_calendar",
      description: "Verifica disponibilidad en el calendario y propone slots",
      parameters: {
        type: "object",
        properties: {
          preferred_dates: { type: "array", items: { type: "string" } },
          session_duration: { type: "number", description: "Duración estimada en horas" }
        }
      }
    }
  },
  {
    type: "function",
    function: {
      name: "create_deposit_link",
      description: "Crea un link de pago de depósito vía Stripe",
      parameters: {
        type: "object",
        properties: {
          amount: { type: "number", description: "Monto del depósito en USD" },
          client_email: { type: "string" },
          booking_description: { type: "string" }
        },
        required: ["amount"]
      }
    }
  }
];

async function executeToolCall(toolName: string, args: any, supabaseUrl: string, supabaseKey: string): Promise<any> {
  console.log(`Executing tool: ${toolName}`, args);

  switch (toolName) {
    case 'analysis_reference': {
      try {
        const response = await fetch(`${supabaseUrl}/functions/v1/analyze-reference`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${supabaseKey}`
          },
          body: JSON.stringify({
            imageUrl: args.image_url,
            bodyPart: args.body_part
          })
        });
        return await response.json();
      } catch (error) {
        return { error: 'Error analyzing reference', details: String(error) };
      }
    }

    case 'viability_simulator': {
      try {
        const response = await fetch(`${supabaseUrl}/functions/v1/viability-3d-simulator`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${supabaseKey}`
          },
          body: JSON.stringify({
            reference_image_url: args.reference_image_url,
            body_part: args.body_part,
            skin_tone: args.skin_tone || 'medium'
          })
        });
        return await response.json();
      } catch (error) {
        return { error: 'Error running simulator', details: String(error) };
      }
    }

    case 'generate_design_variations': {
      try {
        const response = await fetch(`${supabaseUrl}/functions/v1/generate-design`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${supabaseKey}`
          },
          body: JSON.stringify({
            prompt: `${args.description}. Estilo: ${args.style || 'micro-realism'}. ${args.modifications || ''}`,
            style: args.style || 'micro-realism'
          })
        });
        return await response.json();
      } catch (error) {
        return { error: 'Error generating design', details: String(error) };
      }
    }

    case 'check_calendar': {
      // Mock calendar availability
      const slots = [
        'Lunes 15 Ene - 10:00 AM',
        'Miércoles 17 Ene - 2:00 PM', 
        'Viernes 19 Ene - 11:00 AM',
        'Sábado 20 Ene - 3:00 PM'
      ];
      return { 
        available: true, 
        slots,
        estimatedDuration: args.session_duration || 3
      };
    }

    case 'create_deposit_link': {
      try {
        const response = await fetch(`${supabaseUrl}/functions/v1/get-payment-link`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${supabaseKey}`
          },
          body: JSON.stringify({
            amount: args.amount || 100,
            description: args.booking_description || 'Depósito de tatuaje'
          })
        });
        const data = await response.json();
        return { 
          paymentUrl: data.url || 'https://stripe.com/pay/demo',
          amount: args.amount || 100
        };
      } catch (error) {
        return { 
          paymentUrl: 'https://stripe.com/pay/demo',
          amount: args.amount || 100
        };
      }
    }

    default:
      return { error: `Unknown tool: ${toolName}` };
  }
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { message, imageUrl, conversationHistory, memory } = await req.json();
    
    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    const SUPABASE_URL = Deno.env.get('SUPABASE_URL');
    const SUPABASE_SERVICE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

    if (!LOVABLE_API_KEY) {
      throw new Error('LOVABLE_API_KEY not configured');
    }

    // Build messages array
    const messages = [
      { role: 'system', content: SYSTEM_PROMPT },
      ...(memory?.clientName ? [{
        role: 'system',
        content: `Memoria del cliente: Nombre: ${memory.clientName}. Tatuajes previos: ${memory.previousTattoos?.join(', ') || 'ninguno'}. Preferencias: ${memory.preferences?.join(', ') || 'no definidas'}. Tono de piel: ${memory.skinTone || 'no especificado'}.`
      }] : []),
      ...(conversationHistory || []),
      { 
        role: 'user', 
        content: imageUrl 
          ? `${message}\n\n[El usuario adjuntó una imagen: ${imageUrl}]`
          : message
      }
    ];

    console.log('Calling AI with messages:', messages.length);

    // First AI call with tools
    const aiResponse = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${LOVABLE_API_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash',
        messages,
        tools: TOOLS,
        tool_choice: 'auto'
      })
    });

    if (!aiResponse.ok) {
      const errorText = await aiResponse.text();
      console.error('AI API error:', aiResponse.status, errorText);
      throw new Error(`AI API error: ${aiResponse.status}`);
    }

    const aiData = await aiResponse.json();
    const assistantMessage = aiData.choices[0].message;

    console.log('AI response:', JSON.stringify(assistantMessage, null, 2));

    // Check for tool calls
    const toolCalls = assistantMessage.tool_calls || [];
    const attachments: any[] = [];
    const toolResults: any[] = [];

    if (toolCalls.length > 0) {
      // Execute all tool calls
      for (const toolCall of toolCalls) {
        const toolName = toolCall.function.name;
        const toolArgs = JSON.parse(toolCall.function.arguments || '{}');
        
        console.log(`Executing tool: ${toolName}`, toolArgs);
        
        const result = await executeToolCall(
          toolName, 
          toolArgs, 
          SUPABASE_URL || '', 
          SUPABASE_SERVICE_KEY || ''
        );

        toolResults.push({
          name: toolName,
          status: 'completed',
          result
        });

        // Convert tool results to attachments
        if (toolName === 'viability_simulator' && result.risk_zones) {
          attachments.push({
            type: 'heatmap',
            data: { riskZones: result.risk_zones }
          });
          if (result.movement_video_url) {
            attachments.push({
              type: 'video',
              url: result.movement_video_url
            });
          }
        }
        if (toolName === 'check_calendar' && result.slots) {
          attachments.push({
            type: 'calendar',
            data: { slots: result.slots }
          });
        }
        if (toolName === 'create_deposit_link' && result.paymentUrl) {
          attachments.push({
            type: 'payment',
            data: { paymentUrl: result.paymentUrl, amount: result.amount }
          });
        }
      }

      // Second AI call with tool results
      const toolResultMessages = toolCalls.map((tc: any, i: number) => ({
        role: 'tool',
        tool_call_id: tc.id,
        content: JSON.stringify(toolResults[i]?.result || {})
      }));

      const followUpResponse = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${LOVABLE_API_KEY}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          model: 'google/gemini-2.5-flash',
          messages: [
            ...messages,
            assistantMessage,
            ...toolResultMessages
          ]
        })
      });

      if (followUpResponse.ok) {
        const followUpData = await followUpResponse.json();
        const finalMessage = followUpData.choices[0].message.content;

        return new Response(JSON.stringify({
          message: finalMessage,
          toolCalls: toolResults,
          attachments,
          updatedMemory: memory
        }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }
    }

    // Return direct response if no tools
    return new Response(JSON.stringify({
      message: assistantMessage.content,
      toolCalls: [],
      attachments: [],
      updatedMemory: memory
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error('Ferunda Agent error:', error);
    return new Response(JSON.stringify({
      message: 'Lo siento, hubo un problema técnico. ¿Podrías intentarlo de nuevo?',
      error: String(error)
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
});
