import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface CommandRequest {
  command: string;
  context?: {
    currentView?: string;
    recentBookings?: any[];
    availability?: any[];
    selectedClient?: any;
    conversationId?: string;
  };
}

interface ActionResponse {
  action: string;
  payload: Record<string, any>;
  confidence: number;
  explanation: string;
  suggestedFollowUp?: string;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { command, context }: CommandRequest = await req.json();
    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    
    if (!LOVABLE_API_KEY) {
      throw new Error('LOVABLE_API_KEY not configured');
    }

    console.log('[grok-command-ai] Processing command:', command);
    console.log('[grok-command-ai] Context:', JSON.stringify(context));

    const systemPrompt = `Eres un asistente de comando para un sistema de gestión de estudio de tatuajes.
Tu trabajo es interpretar comandos en lenguaje natural y convertirlos en acciones estructuradas.

ACCIONES DISPONIBLES:
- create-booking: Crear una nueva cita (payload: name, email, date, time, style, description)
- view-client: Ver perfil de cliente (payload: email o name)
- create-client: Crear nuevo cliente (payload: name, email, phone)
- send-deposit: Enviar solicitud de depósito (payload: bookingId, amount, clientEmail)
- create-quote: Crear cotización (payload: style, size, complexity, placement)
- create-content: Crear contenido de marketing (payload: type, topic, tone)
- create-design: Generar diseño AI (payload: prompt, style, size)
- ai-generate-reply: Generar respuesta AI (payload: conversationId, context)
- ai-suggest-slots: Sugerir horarios (payload: clientPreferences, duration)
- navigate: Navegar a una sección (payload: path)
- search: Buscar en el sistema (payload: query, type)

CONTEXTO ACTUAL:
${JSON.stringify(context || {}, null, 2)}

Responde SIEMPRE en JSON con este formato:
{
  "action": "nombre-de-accion",
  "payload": { ... datos relevantes ... },
  "confidence": 0.0-1.0,
  "explanation": "Breve explicación de lo que harás",
  "suggestedFollowUp": "Sugerencia opcional de siguiente paso"
}

Si no entiendes el comando, usa action: "clarify" con explanation pidiendo más información.`;

    const response = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${LOVABLE_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: command }
        ],
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(JSON.stringify({ 
          error: 'Rate limit exceeded',
          action: 'error',
          payload: {},
          confidence: 0,
          explanation: 'Demasiadas solicitudes. Intenta de nuevo en unos segundos.'
        }), {
          status: 429,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
      if (response.status === 402) {
        return new Response(JSON.stringify({ 
          error: 'Payment required',
          action: 'error',
          payload: {},
          confidence: 0,
          explanation: 'Créditos AI agotados. Contacta al administrador.'
        }), {
          status: 402,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
      const errorText = await response.text();
      console.error('[grok-command-ai] AI gateway error:', response.status, errorText);
      throw new Error(`AI gateway error: ${response.status}`);
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content || '';
    
    console.log('[grok-command-ai] Raw response:', content);

    // Parse JSON from response
    let actionResponse: ActionResponse;
    try {
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        actionResponse = JSON.parse(jsonMatch[0]);
      } else {
        throw new Error('No JSON found in response');
      }
    } catch (parseError) {
      console.error('[grok-command-ai] Parse error:', parseError);
      actionResponse = {
        action: 'clarify',
        payload: { originalCommand: command },
        confidence: 0.3,
        explanation: 'No pude entender el comando. ¿Puedes ser más específico?',
      };
    }

    console.log('[grok-command-ai] Parsed action:', actionResponse);

    return new Response(JSON.stringify(actionResponse), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error('[grok-command-ai] Error:', errorMessage);
    return new Response(JSON.stringify({ 
      error: errorMessage,
      action: 'error',
      payload: {},
      confidence: 0,
      explanation: 'Error procesando el comando. Intenta de nuevo.'
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
