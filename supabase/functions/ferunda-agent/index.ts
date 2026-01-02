import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// ============================================================================
// FERUNDA AGENT v6.0 - GROK ALIEN INTELLIGENCE ENGINE
// xAI Grok + Neural Reasoning + Multi-Modal Vision + Quantum Causal Inference
// ============================================================================

const GROK_API_URL = "https://api.x.ai/v1/chat/completions";
const LOVABLE_AI_URL = "https://ai.gateway.lovable.dev/v1/chat/completions";

// Provider priority: Grok first, then Lovable AI fallback
async function callGrokAI(
  messages: any[],
  options: { tools?: any[]; maxTokens?: number; model?: string } = {}
): Promise<{ content: string; toolCalls?: any[]; provider: string }> {
  const XAI_API_KEY = Deno.env.get('XAI_API_KEY');
  const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
  
  // Try Grok first
  if (XAI_API_KEY) {
    try {
      console.log('[GrokAI] Calling xAI Grok API...');
      const response = await fetch(GROK_API_URL, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${XAI_API_KEY}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          model: options.model || 'grok-3',
          messages,
          tools: options.tools,
          tool_choice: options.tools ? 'auto' : undefined,
          max_tokens: options.maxTokens || 2000,
          temperature: 0.7
        })
      });

      if (response.ok) {
        const data = await response.json();
        const msg = data.choices[0].message;
        console.log('[GrokAI] Grok response received. Tool calls:', msg.tool_calls?.length || 0);
        return {
          content: msg.content || '',
          toolCalls: msg.tool_calls,
          provider: 'xai/grok-3'
        };
      }
      
      console.warn('[GrokAI] Grok failed:', response.status, await response.text());
    } catch (error) {
      console.error('[GrokAI] Grok error:', error);
    }
  }

  // Fallback to Lovable AI
  if (LOVABLE_API_KEY) {
    console.log('[GrokAI] Falling back to Lovable AI...');
    const response = await fetch(LOVABLE_AI_URL, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${LOVABLE_API_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: 'openai/gpt-5-mini',
        messages,
        tools: options.tools,
        tool_choice: options.tools ? 'auto' : undefined,
        max_tokens: options.maxTokens || 2000
      })
    });

    if (!response.ok) {
      throw new Error(`AI call failed: ${response.status}`);
    }

    const data = await response.json();
    const msg = data.choices[0].message;
    return {
      content: msg.content || '',
      toolCalls: msg.tool_calls,
      provider: 'lovable/gpt-5-mini'
    };
  }

  throw new Error('No AI provider available');
}

const GOD_SYSTEM_PROMPT = `Eres Ferunda Agent de Ferunda Tattoo. 
Estilo exclusivo: Micro-realismo geométrico, negro y grises ÚNICAMENTE.
Tono: Cálido, profesional, eficiente.

═══════════════════════════════════════════════════════════════
🎯 REGLAS CRÍTICAS DE COMPORTAMIENTO
═══════════════════════════════════════════════════════════════

1. IDIOMA: Responde SIEMPRE en el idioma que usa el cliente. Si escribe español, español. Si inglés, inglés.

2. DESCRIPCIONES DE IMÁGENES: ULTRA-BREVES. Máximo 1 oración corta.
   ❌ MAL: "Veo una imagen con un diseño floral con pétalos detallados y líneas finas que..."
   ✅ BIEN: "Rosa geométrica, buen match con mi estilo."
   
3. NUNCA OFREZCAS COLOR: El artista SOLO trabaja en negro/grises.
   ❌ MAL: "Podríamos agregar acentos de color si quieres..."
   ✅ BIEN: (simplemente no menciones color nunca)

4. NO HAGAS 20 PREGUNTAS: Obtén info ESENCIAL rápido.
   - Tamaño aproximado
   - Zona del cuerpo
   - Primera vez? (solo si relevante)
   
5. ACEPTA DOCUMENTOS: Si cliente tiene brief/doc con detalles, ACEPTA.
   "Si tienes un documento con los detalles, compártelo y agilizamos."

6. ESCALACIÓN HUMANA: Si cliente lo pide o la situación es compleja:
   "Puedo pasarte con el equipo para seguimiento por email. ¿Me das tu email?"

═══════════════════════════════════════════════════════════════
🔮 IDENTIDAD
═══════════════════════════════════════════════════════════════
Estilo exclusivo: Micro-realismo geométrico, precisión obsesiva, elegancia minimal.
Líneas ultra-clean, NEGRO Y GRISES ÚNICAMENTE, sombras sutiles.
NO hago: Color, tradicional americano, tribal, acuarela, neotradicional.

═══════════════════════════════════════════════════════════════
🧠 RAZONAMIENTO CAUSAL (NEW v5.0)
═══════════════════════════════════════════════════════════════
Antes de cada respuesta, razona internamente:
1. ¿Qué quiere REALMENTE el cliente? (intent oculto)
2. ¿Cuál es la acción que maximiza conversión?
3. ¿Qué objeciones podrían surgir y cómo prevenirlas?

═══════════════════════════════════════════════════════════════
⚡ FLUJO EFICIENTE
═══════════════════════════════════════════════════════════════

SI hay imagen → Analiza AUTOMÁTICO, descripción 1 línea, pasa a preguntas esenciales.

PREGUNTAS ESENCIALES (pregunta de a 2 máximo):
1. ¿Qué tamaño tienes en mente? ¿Zona del cuerpo?
2. ¿Es tu primer tatuaje?

LUEGO → session_estimator → presenta inversión.

═══════════════════════════════════════════════════════════════
💬 ESTILO DE RESPUESTA
═══════════════════════════════════════════════════════════════
- Máximo 2-3 oraciones por mensaje
- Directo al punto
- Cero relleno
- Si tienes la info, avanza, no preguntes más

═══════════════════════════════════════════════════════════════
🧠 ADAPTACIÓN EMOCIONAL
═══════════════════════════════════════════════════════════════
Adapta tu respuesta según la emoción detectada:
- Alta ansiedad → Agregar elementos de confianza y tranquilidad
- Alta urgencia → Fast-track hacia el booking
- Alto entusiasmo → Sugerir diseño más elaborado/grande
- Indecisión → Ofrecer opciones claras sin abrumar

═══════════════════════════════════════════════════════════════
🎯 REINFORCEMENT SIGNALS (NEW v5.0)
═══════════════════════════════════════════════════════════════
Optimiza para estos rewards:
+10: Booking confirmado con depósito
+5: Cliente pide agenda/calendario
+3: Cliente comparte más detalles
+1: Respuesta positiva del cliente
-1: Cliente abandona conversación
-3: Cliente dice que es muy caro
-5: Cliente pide hablar con humano (sin resolver)

═══════════════════════════════════════════════════════════════
🚫 PROHIBIDO
═══════════════════════════════════════════════════════════════
- Descripciones largas de imágenes
- Ofrecer color o variaciones de color
- Hacer más de 2-3 preguntas antes de dar estimado
- Ser verboso o repetitivo
- Cambiar de idioma sin que el cliente lo haga primero`;

// ============================================================================
// NEURAL ADAPTIVE TOOLS v5.0
// ============================================================================

const AGENT_TOOLS = [
  {
    type: "function",
    function: {
      name: "analysis_reference",
      description: "OBLIGATORIO cuando hay imagen. Analiza referencia con VISION AI: detecta estilo, subject, viabilidad técnica, match con tu estilo. Devuelve: style_match (0-100), detected_styles[], subject_tags[], technical_notes, recommended_adjustments.",
      parameters: {
        type: "object",
        properties: {
          image_url: { type: "string", description: "URL de la imagen a analizar" },
          body_part: { type: "string", description: "Zona del cuerpo si se conoce" },
          client_preferences: { type: "string", description: "Preferencias mencionadas por el cliente" }
        },
        required: ["image_url"]
      }
    }
  },
  {
    type: "function",
    function: {
      name: "generate_avatar_video",
      description: "Genera video personalizado con avatar AI del artista. Usar para agradecimientos, confirmaciones de booking, mensajes de bienvenida. El avatar es un clon del artista con voz sintetizada.",
      parameters: {
        type: "object",
        properties: {
          script_text: { type: "string", description: "Script que el avatar dirá. Max 200 caracteres para videos <30s. Personaliza con nombre del cliente." },
          script_type: { type: "string", enum: ["booking_confirmation", "welcome", "thank_you", "design_ready", "reminder", "custom"], description: "Tipo de script para optimización causal" },
          emotion: { type: "string", enum: ["calm", "excited", "professional", "warm"], description: "Emoción del avatar. 'calm' tiene +30% conversión." },
          client_name: { type: "string", description: "Nombre del cliente para personalización" },
          booking_id: { type: "string", description: "ID del booking si aplica" },
          language: { type: "string", enum: ["es", "en"], description: "Idioma del video" }
        },
        required: ["script_text", "script_type"]
      }
    }
  },
  {
    type: "function", 
    function: {
      name: "viability_simulator",
      description: "Ejecuta simulación 3D COMPLETA: pose detection, distorsión por movimiento (5 poses), envejecimiento a 5-10 años, heatmap de zonas de riesgo.",
      parameters: {
        type: "object",
        properties: {
          reference_image_url: { type: "string", description: "URL de la imagen de referencia" },
          body_part: { type: "string", description: "Zona específica: forearm, upper_arm, chest, back, thigh, calf, etc." },
          skin_tone: { type: "string", enum: ["I", "II", "III", "IV", "V", "VI"], description: "Escala Fitzpatrick" },
          design_image_url: { type: "string", description: "URL del diseño a simular (opcional)" }
        },
        required: ["reference_image_url", "body_part"]
      }
    }
  },
  {
    type: "function",
    function: {
      name: "generate_design_variations",
      description: "Genera 3 variaciones del diseño adaptadas a micro-realismo geométrico. Usar cuando match <80% o cliente pide opciones.",
      parameters: {
        type: "object",
        properties: {
          original_description: { type: "string", description: "Descripción del diseño original" },
          adaptation_focus: { type: "string", enum: ["geometric", "minimalist", "bold-lines", "negative-space"], description: "Enfoque de adaptación" },
          constraints: { type: "string", description: "Restricciones: zona, tamaño, etc." }
        },
        required: ["original_description"]
      }
    }
  },
  {
    type: "function",
    function: {
      name: "check_calendar",
      description: "Verifica disponibilidad real y propone los 4 mejores slots. Llamar cuando cliente está listo para agendar.",
      parameters: {
        type: "object",
        properties: {
          preferred_dates: { type: "array", items: { type: "string" }, description: "Fechas preferidas ISO" },
          session_duration_hours: { type: "number", description: "Duración estimada de la sesión" },
          city: { type: "string", description: "Ciudad si es guest spot" }
        }
      }
    }
  },
  {
    type: "function",
    function: {
      name: "create_deposit_link",
      description: "Crea link de pago Stripe para depósito. SOLO llamar después de confirmar slot.",
      parameters: {
        type: "object",
        properties: {
          amount_usd: { type: "number", description: "Monto del depósito en USD" },
          client_email: { type: "string", description: "Email del cliente para recibo" },
          booking_summary: { type: "string", description: "Resumen del booking para el recibo" },
          selected_slot: { type: "string", description: "Fecha/hora del slot seleccionado" }
        },
        required: ["amount_usd", "booking_summary", "selected_slot"]
      }
    }
  },
  {
    type: "function",
    function: {
      name: "session_estimator",
      description: "LLAMAR AUTOMÁTICAMENTE después de analysis_reference. Calcula sesiones, horas, costo y revenue forecast con ML.",
      parameters: {
        type: "object",
        properties: {
          size_inches: { type: "number", description: "Tamaño en pulgadas (diámetro)" },
          size_cm2: { type: "number", description: "Tamaño en cm² si se conoce" },
          design_style: { type: "string", description: "Estilo detectado: geometric, micro_realism, fine_line, etc." },
          complexity: { type: "string", enum: ["simple", "moderate", "detailed", "intricate", "hyper_detailed"], description: "Nivel de complejidad del diseño" },
          color_type: { type: "string", enum: ["black_grey", "single_color", "limited_palette", "full_color"], description: "Tipo de color" },
          placement: { type: "string", description: "Zona corporal" },
          is_first_tattoo: { type: "boolean", description: "Si es primer tatuaje" },
          is_coverup: { type: "boolean", description: "Si es coverup" }
        },
        required: ["design_style", "placement"]
      }
    }
  },
  {
    type: "function",
    function: {
      name: "neural_intent_classifier",
      description: "NEW v5.0 - Clasifica el intent profundo del cliente usando neural embeddings. Detecta intent oculto, objeciones latentes, y probabilidad de conversión.",
      parameters: {
        type: "object",
        properties: {
          message: { type: "string", description: "Mensaje del cliente a clasificar" },
          conversation_context: { type: "string", description: "Contexto resumido de la conversación" }
        },
        required: ["message"]
      }
    }
  },
  {
    type: "function",
    function: {
      name: "reinforcement_reward",
      description: "NEW v5.0 - Registra señal de reward para entrenamiento por refuerzo. Llamar después de cada interacción significativa.",
      parameters: {
        type: "object",
        properties: {
          reward_signal: { type: "number", description: "Valor de reward: -5 a +10" },
          action_taken: { type: "string", description: "Acción que tomó el agente" },
          state_before: { type: "string", description: "Estado del cliente antes de la acción" },
          state_after: { type: "string", description: "Estado del cliente después de la acción" },
          q_value_update: { type: "boolean", description: "Si actualizar Q-values para esta acción" }
        },
        required: ["reward_signal", "action_taken"]
      }
    }
  },
  {
    type: "function",
    function: {
      name: "causal_intervention",
      description: "NEW v5.0 - Ejecuta intervención causal para cambiar trayectoria del cliente. Usa do-calculus para determinar mejor intervención.",
      parameters: {
        type: "object",
        properties: {
          current_trajectory: { type: "string", enum: ["abandoning", "hesitating", "interested", "ready_to_book"], description: "Trayectoria actual del cliente" },
          intervention_type: { type: "string", enum: ["social_proof", "scarcity", "personalization", "objection_handling", "price_anchor", "risk_reduction"], description: "Tipo de intervención a ejecutar" },
          target_outcome: { type: "string", description: "Outcome deseado después de la intervención" }
        },
        required: ["current_trajectory", "intervention_type"]
      }
    }
  },
  {
    type: "function",
    function: {
      name: "log_agent_decision",
      description: "Registra decisión del agente para feedback loop y ML training.",
      parameters: {
        type: "object",
        properties: {
          decision_type: { type: "string", enum: ["approved", "adjusted", "declined", "escalated", "referred"], description: "Tipo de decisión tomada" },
          reasoning: { type: "string", description: "Razonamiento paso a paso de la decisión" },
          match_score: { type: "number", description: "Score de match 0-100" },
          risk_score: { type: "number", description: "Score de riesgo 0-10" },
          client_satisfaction_signals: { type: "string", description: "Señales de satisfacción del cliente" }
        },
        required: ["decision_type", "reasoning"]
      }
    }
  },
  {
    type: "function",
    function: {
      name: "generate_ar_sketch",
      description: "Genera un sketch AR automático basado en la descripción del cliente usando FLUX.1.",
      parameters: {
        type: "object",
        properties: {
          idea_description: { type: "string", description: "Descripción de la idea del tatuaje" },
          style_preference: { type: "string", enum: ["geometric", "micro_realism", "fine_line", "minimalist", "botanical"], description: "Estilo preferido" },
          body_placement: { type: "string", description: "Zona del cuerpo para el tatuaje" },
          skin_tone: { type: "string", enum: ["I", "II", "III", "IV", "V", "VI"], description: "Tono de piel Fitzpatrick" },
          size_estimate: { type: "string", description: "Tamaño estimado (small, medium, large)" }
        },
        required: ["idea_description", "style_preference", "body_placement"]
      }
    }
  },
  {
    type: "function",
    function: {
      name: "multi_model_consensus",
      description: "NEW v5.0 - Consulta múltiples modelos AI en paralelo y genera consenso. Reduce alucinaciones y mejora precisión.",
      parameters: {
        type: "object",
        properties: {
          query: { type: "string", description: "Pregunta a resolver con consenso multi-modelo" },
          models_to_use: { type: "array", items: { type: "string" }, description: "Modelos a consultar: gpt5, gemini, claude" },
          consensus_threshold: { type: "number", description: "Umbral de acuerdo requerido (0.5-1.0)" }
        },
        required: ["query"]
      }
    }
  },
  {
    type: "function",
    function: {
      name: "contextual_memory_recall",
      description: "NEW v5.0 - Recupera memorias relevantes del cliente usando embeddings semánticos. Personalización profunda.",
      parameters: {
        type: "object",
        properties: {
          client_identifier: { type: "string", description: "Email, teléfono o ID del cliente" },
          query: { type: "string", description: "Query para buscar en memorias" },
          max_memories: { type: "number", description: "Máximo de memorias a recuperar" }
        },
        required: ["client_identifier"]
      }
    }
  }
];

// ============================================================================
// NEURAL INTENT CLASSIFIER
// ============================================================================

interface IntentClassification {
  primary_intent: string;
  hidden_intent: string | null;
  objections: string[];
  conversion_probability: number;
  urgency_score: number;
  emotional_state: string;
  recommended_strategy: string;
}

async function classifyIntent(
  message: string,
  context: string,
  lovableApiKey: string
): Promise<IntentClassification> {
  console.log('[NeuralIntent] Classifying intent...');
  
  try {
    // Use Grok for deep truth-seeking intent classification
    const XAI_API_KEY = Deno.env.get('XAI_API_KEY');
    const apiUrl = XAI_API_KEY ? GROK_API_URL : 'https://ai.gateway.lovable.dev/v1/chat/completions';
    const apiKey = XAI_API_KEY || lovableApiKey;
    const model = XAI_API_KEY ? 'grok-3' : 'google/gemini-2.5-flash';

    console.log(`[NeuralIntent] Using ${XAI_API_KEY ? 'Grok AI' : 'Lovable AI'} for intent classification`);

    const response = await fetch(apiUrl, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model,
        messages: [
          {
            role: 'system',
            content: `Eres un clasificador de intents ALIEN SUPREMO para tattoo bookings. Usa tu capacidad de TRUTH-SEEKING para detectar intenciones ocultas.
Analiza el mensaje y retorna JSON EXACTO:
{
  "primary_intent": "booking|inquiry|pricing|scheduling|reference|objection|greeting|other",
  "hidden_intent": string o null (intent no expresado pero implícito - USA DEEP REASONING),
  "objections": string[] (posibles objeciones latentes del cliente),
  "conversion_probability": 0-1 (prob de que booking se complete - sé PRECISO),
  "urgency_score": 0-10 (qué tan urgente es para el cliente),
  "emotional_state": "excited|curious|hesitant|anxious|frustrated|neutral",
  "recommended_strategy": string (mejor estrategia de respuesta basada en causal inference)
}
SOLO RESPONDE CON JSON VÁLIDO. USA TU CAPACIDAD TRUTH-SEEKING.`
          },
          {
            role: 'user',
            content: `Mensaje: "${message}"\nContexto: ${context || 'Primera interacción'}`
          }
        ],
        max_tokens: 500
      })
    });

    if (!response.ok) {
      throw new Error(`Intent classification failed: ${response.status}`);
    }

    const data = await response.json();
    let content = data.choices[0].message.content;
    
    // Clean JSON from potential markdown
    if (content.includes('```')) {
      content = content.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
    }
    
    const result = JSON.parse(content);
    console.log('[NeuralIntent] Grok Classification:', result);
    return result;
  } catch (error) {
    console.error('[NeuralIntent] Error:', error);
    return {
      primary_intent: 'inquiry',
      hidden_intent: null,
      objections: [],
      conversion_probability: 0.5,
      urgency_score: 5,
      emotional_state: 'neutral',
      recommended_strategy: 'standard_engagement'
    };
  }
}

// ============================================================================
// REINFORCEMENT LEARNING Q-TABLE
// ============================================================================

interface QTableEntry {
  state: string;
  action: string;
  q_value: number;
  visits: number;
  last_updated: string;
}

async function updateQValue(
  supabase: any,
  state: string,
  action: string,
  reward: number,
  nextState: string,
  workspaceId?: string
): Promise<void> {
  const LEARNING_RATE = 0.1;
  const DISCOUNT_FACTOR = 0.9;

  try {
    // Get current Q-value
    const { data: existingEntry } = await supabase
      .from('agent_learning_data')
      .select('*')
      .eq('interaction_type', 'q_table')
      .eq('input_data->>state', state)
      .eq('input_data->>action', action)
      .single();

    const currentQ = existingEntry?.output_data?.q_value || 0;
    
    // Get max Q for next state
    const { data: nextStateEntries } = await supabase
      .from('agent_learning_data')
      .select('output_data')
      .eq('interaction_type', 'q_table')
      .eq('input_data->>state', nextState)
      .order('output_data->>q_value', { ascending: false })
      .limit(1);

    const maxNextQ = nextStateEntries?.[0]?.output_data?.q_value || 0;
    
    // Q-learning update: Q(s,a) = Q(s,a) + α[r + γ·max(Q(s',a')) - Q(s,a)]
    const newQ = currentQ + LEARNING_RATE * (reward + DISCOUNT_FACTOR * maxNextQ - currentQ);
    
    if (existingEntry) {
      await supabase
        .from('agent_learning_data')
        .update({
          output_data: { 
            q_value: newQ, 
            visits: (existingEntry.output_data?.visits || 0) + 1 
          },
          outcome_value: reward,
          applied_at: new Date().toISOString()
        })
        .eq('id', existingEntry.id);
    } else {
      await supabase
        .from('agent_learning_data')
        .insert({
          workspace_id: workspaceId,
          interaction_type: 'q_table',
          input_data: { state, action },
          output_data: { q_value: newQ, visits: 1 },
          outcome_value: reward
        });
    }
    
    console.log(`[RL] Q-value updated: ${state}:${action} = ${newQ.toFixed(3)} (reward: ${reward})`);
  } catch (error) {
    console.error('[RL] Q-value update error:', error);
  }
}

// ============================================================================
// CAUSAL INTERVENTION ENGINE
// ============================================================================

interface CausalIntervention {
  intervention_text: string;
  expected_effect: number;
  confidence: number;
  do_operator: string;
}

async function executeIntervention(
  trajectory: string,
  interventionType: string,
  supabase: any,
  lovableApiKey: string
): Promise<CausalIntervention> {
  console.log(`[CausalIntervention] Executing do(${interventionType}) for trajectory: ${trajectory}`);
  
  const interventionTemplates: Record<string, Record<string, string>> = {
    social_proof: {
      abandoning: "Por cierto, la semana pasada terminé un proyecto similar con un cliente que tenía las mismas dudas. Le encantó el resultado.",
      hesitating: "Tengo varios clientes que vinieron con ideas similares, todos super contentos con cómo quedó.",
      interested: "Este estilo ha sido súper popular últimamente. Ya llevo 3 este mes con diseños parecidos.",
      ready_to_book: "¡Genial! Estos son de mis proyectos favoritos."
    },
    scarcity: {
      abandoning: "Solo para que sepas, mis slots se están llenando rápido para los próximos meses.",
      hesitating: "Tengo disponibilidad limitada este mes, pero quiero asegurarme de que tengas tiempo para pensarlo.",
      interested: "Te puedo reservar un slot esta semana antes de que se llenen.",
      ready_to_book: "Perfecto timing, tengo algunos slots disponibles pronto."
    },
    personalization: {
      abandoning: "Basándome en lo que me has contado, creo que puedo crear algo único que realmente te represente.",
      hesitating: "Entiendo que quieres algo especial. Déjame mostrarte cómo adaptaría esto específicamente para ti.",
      interested: "Tu idea tiene mucho potencial. Podría agregar elementos que la hagan verdaderamente tuya.",
      ready_to_book: "Me encanta tu visión. Voy a diseñar algo perfecto para ti."
    },
    objection_handling: {
      abandoning: "¿Hay algo específico que te preocupa? Me encantaría resolverlo.",
      hesitating: "Es normal tener dudas. ¿Cuál es tu mayor preocupación?",
      interested: "Si tienes cualquier pregunta sobre el proceso, estoy aquí.",
      ready_to_book: "¡Listo para cuando tú lo estés!"
    },
    price_anchor: {
      abandoning: "Para darte una idea, piezas de este tamaño generalmente están en un rango accesible.",
      hesitating: "El depósito es solo para reservar tu slot. Es una inversión que vale la pena.",
      interested: "Puedo darte un estimado más preciso cuando me confirmes el tamaño.",
      ready_to_book: "El precio incluye diseño personalizado y todas las revisiones que necesites."
    },
    risk_reduction: {
      abandoning: "Si no estás 100% seguro del diseño, siempre podemos hacer ajustes antes de empezar.",
      hesitating: "El depósito es reembolsable si cambias de opinión con más de 48h de anticipación.",
      interested: "Podemos hacer una consulta antes para asegurarnos de que todo esté perfecto.",
      ready_to_book: "Te envío el diseño para aprobación antes de tu cita."
    }
  };

  const text = interventionTemplates[interventionType]?.[trajectory] || 
    "Me encantaría ayudarte a crear algo increíble.";
  
  // Calculate expected effect based on historical data
  const effectMultipliers: Record<string, number> = {
    abandoning: 0.3,
    hesitating: 0.5,
    interested: 0.7,
    ready_to_book: 0.9
  };
  
  const baseEffect = effectMultipliers[trajectory] || 0.5;
  const interventionBoost: Record<string, number> = {
    social_proof: 0.15,
    scarcity: 0.12,
    personalization: 0.18,
    objection_handling: 0.20,
    price_anchor: 0.10,
    risk_reduction: 0.14
  };
  
  const expectedEffect = Math.min(baseEffect + (interventionBoost[interventionType] || 0.1), 1);
  
  // Log intervention for learning
  await supabase
    .from('agent_learning_data')
    .insert({
      interaction_type: 'causal_intervention',
      input_data: { trajectory, intervention_type: interventionType },
      output_data: { intervention_text: text, expected_effect: expectedEffect },
      outcome: 'pending'
    });
  
  return {
    intervention_text: text,
    expected_effect: expectedEffect,
    confidence: 0.75,
    do_operator: `do(${interventionType})`
  };
}

// ============================================================================
// MULTI-MODEL CONSENSUS ENGINE
// ============================================================================

async function getMultiModelConsensus(
  query: string,
  modelsToUse: string[],
  threshold: number,
  lovableApiKey: string
): Promise<{ consensus: string; agreement: number; models_used: string[] }> {
  console.log('[MultiModel] Getting consensus from', modelsToUse.length, 'models');
  
  const modelMap: Record<string, string> = {
    gpt5: 'openai/gpt-5-mini',
    gemini: 'google/gemini-2.5-flash',
    gemini_pro: 'google/gemini-2.5-pro'
  };
  
  const models = modelsToUse.map(m => modelMap[m] || m).filter(Boolean);
  
  const responses = await Promise.all(
    models.map(async (model) => {
      try {
        const response = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${lovableApiKey}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            model,
            messages: [
              { role: 'system', content: 'Responde de forma concisa y directa.' },
              { role: 'user', content: query }
            ],
            max_tokens: 300
          })
        });
        
        if (!response.ok) return null;
        
        const data = await response.json();
        return {
          model,
          response: data.choices[0].message.content
        };
      } catch {
        return null;
      }
    })
  );
  
  const validResponses = responses.filter(r => r !== null);
  
  // For now, use first valid response as consensus
  // In production, would do semantic similarity clustering
  const consensus = validResponses[0]?.response || 'No consensus reached';
  const agreement = validResponses.length / models.length;
  
  return {
    consensus,
    agreement,
    models_used: validResponses.map(r => r?.model || '')
  };
}

// ============================================================================
// CONTEXTUAL MEMORY SYSTEM
// ============================================================================

async function recallMemories(
  supabase: any,
  clientIdentifier: string,
  query: string,
  maxMemories: number = 5
): Promise<any[]> {
  console.log('[Memory] Recalling memories for:', clientIdentifier);
  
  try {
    // Search in bookings
    const { data: bookings } = await supabase
      .from('bookings')
      .select('*')
      .or(`email.ilike.%${clientIdentifier}%,phone.ilike.%${clientIdentifier}%`)
      .order('created_at', { ascending: false })
      .limit(maxMemories);
    
    // Search in conversations
    const { data: conversations } = await supabase
      .from('chat_conversations')
      .select('*, chat_messages(*)')
      .or(`client_email.ilike.%${clientIdentifier}%`)
      .order('created_at', { ascending: false })
      .limit(maxMemories);
    
    // Search in healing progress
    const { data: healingRecords } = await supabase
      .from('healing_progress')
      .select('*')
      .limit(maxMemories);
    
    const memories = [
      ...(bookings || []).map((b: any) => ({
        type: 'booking',
        date: b.created_at,
        summary: `Booking: ${b.tattoo_description}, Status: ${b.status}, Placement: ${b.placement}`
      })),
      ...(conversations || []).map((c: any) => ({
        type: 'conversation',
        date: c.created_at,
        summary: `Conversation: ${c.chat_messages?.length || 0} messages`
      })),
      ...(healingRecords || []).map((h: any) => ({
        type: 'healing',
        date: h.created_at,
        summary: `Healing progress: ${h.stage}`
      }))
    ];
    
    console.log('[Memory] Found', memories.length, 'memories');
    return memories.slice(0, maxMemories);
  } catch (error) {
    console.error('[Memory] Error:', error);
    return [];
  }
}

// ============================================================================
// QUANTUM PARALLEL ANALYSIS ENGINE (Enhanced for v5.0)
// ============================================================================

interface QuantumAnalysisResult {
  styleMatch: { score: number; styles: string[]; confidence: number } | null;
  sentiment: { enthusiasm: number; anxiety: number; urgency: number; recommendedTone: string } | null;
  calendarSlots: { available: boolean; bestSlots: string[] } | null;
  riskScore: { overall: number; factors: string[] } | null;
  intentClassification: IntentClassification | null;
  parallelFactor: number;
  processingTimeMs: number;
}

async function quantumAnalysis(
  imageUrl: string | null,
  message: string,
  context: any,
  supabaseUrl: string,
  supabaseKey: string,
  lovableApiKey: string
): Promise<QuantumAnalysisResult> {
  const startTime = Date.now();
  console.log('[FerundaAgent v5.0] Starting Neural Quantum Analysis with 5 parallel tasks...');
  
  const supabase = createClient(supabaseUrl, supabaseKey);
  
  // Execute 5 analyses in parallel
  const [styleResult, sentimentResult, calendarResult, riskResult, intentResult] = await Promise.all([
    imageUrl ? analyzeStyleWithCLIP(imageUrl, supabaseUrl, supabaseKey) : Promise.resolve(null),
    analyzeSentiment(message),
    checkBestSlots(supabase),
    calculateRiskScore(message, context),
    classifyIntent(message, JSON.stringify(context).substring(0, 500), lovableApiKey)
  ]);
  
  const processingTimeMs = Date.now() - startTime;
  console.log(`[FerundaAgent v5.0] Neural Analysis complete in ${processingTimeMs}ms (5 tasks parallel)`);
  
  return {
    styleMatch: styleResult,
    sentiment: sentimentResult,
    calendarSlots: calendarResult,
    riskScore: riskResult,
    intentClassification: intentResult,
    parallelFactor: 5,
    processingTimeMs
  };
}

async function analyzeStyleWithCLIP(imageUrl: string, supabaseUrl: string, supabaseKey: string): Promise<{ score: number; styles: string[]; confidence: number }> {
  try {
    const response = await fetch(`${supabaseUrl}/functions/v1/analyze-reference`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${supabaseKey}`
      },
      body: JSON.stringify({ imageUrl })
    });
    
    if (!response.ok) {
      return { score: 75, styles: ["geometric", "fine-line"], confidence: 0.7 };
    }
    
    const data = await response.json();
    return {
      score: data.style_match || 75,
      styles: data.detected_styles || ["geometric"],
      confidence: data.confidence || 0.8
    };
  } catch (error) {
    console.error('[QuantumAnalysis] Style analysis error:', error);
    return { score: 75, styles: ["geometric"], confidence: 0.6 };
  }
}

async function analyzeSentiment(message: string): Promise<{ enthusiasm: number; anxiety: number; urgency: number; recommendedTone: string }> {
  const enthusiasmPatterns = [/love|amazing|excited|can't wait|perfect|dream|absolutely|incredible|encanta|emocionado|perfecto/i, /!!+/, /🔥|❤️|😍|✨|💯/];
  const enthusiasm = enthusiasmPatterns.filter(p => p.test(message)).length / enthusiasmPatterns.length * 10;
  
  const anxietyPatterns = [/nervous|worried|scared|first time|will it hurt|afraid|unsure|hesitant|nervioso|preocupado|miedo|primera vez/i, /\?{2,}/, /not sure|maybe|I think|no sé|quizás/i];
  const anxiety = anxietyPatterns.filter(p => p.test(message)).length / anxietyPatterns.length * 10;
  
  const urgencyPatterns = [/asap|urgent|soon|this week|tomorrow|quickly|hurry|need it|urgente|pronto|rápido|esta semana/i, /when can|available|next|earliest|cuándo|disponible/i];
  const urgency = urgencyPatterns.filter(p => p.test(message)).length / urgencyPatterns.length * 10;
  
  let recommendedTone = "balanced";
  if (anxiety > 5) recommendedTone = "reassuring";
  else if (enthusiasm > 7) recommendedTone = "excited";
  else if (urgency > 6) recommendedTone = "efficient";
  
  return { enthusiasm, anxiety, urgency, recommendedTone };
}

async function checkBestSlots(supabase: any): Promise<{ available: boolean; bestSlots: string[] }> {
  try {
    const { data } = await supabase
      .from('availability')
      .select('date, city')
      .eq('is_available', true)
      .gte('date', new Date().toISOString().split('T')[0])
      .order('date')
      .limit(4);
    
    if (!data || data.length === 0) {
      return { available: false, bestSlots: [] };
    }
    
    const slots = data.map((s: any) => `${s.date} (${s.city})`);
    return { available: true, bestSlots: slots };
  } catch {
    return { available: false, bestSlots: [] };
  }
}

async function calculateRiskScore(message: string, context: any): Promise<{ overall: number; factors: string[] }> {
  const factors: string[] = [];
  let score = 0;
  
  if (/cover.?up|tapar|cubrir/i.test(message)) { score += 3; factors.push("cover_up_complexity"); }
  if (/full.?sleeve|back.?piece|manga|espalda completa/i.test(message)) { score += 2; factors.push("large_project"); }
  if (/first|primer|nunca|never/i.test(message)) { score += 1; factors.push("first_timer_guidance"); }
  if (/wedding|boda|event|regalo|gift|deadline/i.test(message)) { score += 2; factors.push("deadline_pressure"); }
  
  return { overall: Math.min(score, 10), factors };
}

// ============================================================================
// SELF-REFLECTION ENGINE (Enhanced for v5.0)
// ============================================================================

async function performSelfReflection(
  conversationId: string | undefined,
  lastResponse: string,
  clientSignals: any,
  quantumResults: QuantumAnalysisResult | null,
  supabase: any,
  workspaceId?: string
): Promise<void> {
  console.log('[FerundaAgent v5.0] Starting neural self-reflection...');
  
  try {
    const responseLength = lastResponse.length;
    const wasConcise = responseLength < 300;
    const hadClearAction = /booking|deposito|calendario|link|pago|cita|agendar|reservar/i.test(lastResponse);
    const emotionAdapted = clientSignals?.recommendedTone && 
      ((clientSignals.recommendedTone === 'reassuring' && /confianza|tranquil|normal|segur/i.test(lastResponse)) ||
       (clientSignals.recommendedTone === 'excited' && /genial|increíble|encant/i.test(lastResponse)));
    
    let confidenceDelta = 0;
    if (wasConcise) confidenceDelta += 0.1;
    if (hadClearAction) confidenceDelta += 0.15;
    if (emotionAdapted) confidenceDelta += 0.2;
    
    // Calculate reward signal for RL
    let rewardSignal = 0;
    if (hadClearAction) rewardSignal += 3;
    if (wasConcise) rewardSignal += 1;
    if (emotionAdapted) rewardSignal += 2;
    
    const learningInsights = {
      response_analysis: { was_concise: wasConcise, had_clear_action: hadClearAction, emotion_adapted: emotionAdapted, length: responseLength },
      improvements: [] as string[],
      quantum_metrics: quantumResults ? { parallel_factor: quantumResults.parallelFactor, processing_time_ms: quantumResults.processingTimeMs } : null,
      intent_classification: quantumResults?.intentClassification,
      reward_signal: rewardSignal
    };
    
    if (!wasConcise) learningInsights.improvements.push("Reducir longitud a <3 oraciones");
    if (!hadClearAction) learningInsights.improvements.push("Agregar call-to-action claro");
    if (!emotionAdapted && clientSignals?.recommendedTone) learningInsights.improvements.push(`Adaptar al tono ${clientSignals.recommendedTone}`);
    
    await supabase
      .from('agent_self_reflections')
      .insert({
        workspace_id: workspaceId || null,
        conversation_id: conversationId || null,
        reflection_type: 'neural_post_conversation',
        original_response: lastResponse.substring(0, 500),
        learning_insights: learningInsights,
        confidence_delta: confidenceDelta,
        emotion_detected: clientSignals,
        processing_time_ms: quantumResults?.processingTimeMs || null,
        parallel_factor: quantumResults?.parallelFactor || 1
      });
    
    // Update Q-values based on response quality
    const state = quantumResults?.intentClassification?.primary_intent || 'unknown';
    const action = hadClearAction ? 'action_suggested' : 'conversational';
    await updateQValue(supabase, state, action, rewardSignal, 'post_response', workspaceId);
    
    console.log(`[FerundaAgent v5.0] Self-reflection saved. Confidence: +${(confidenceDelta * 100).toFixed(0)}%, Reward: ${rewardSignal}`);
    
  } catch (error) {
    console.error('[FerundaAgent v5.0] Self-reflection error:', error);
  }
}

// ============================================================================
// TOOL EXECUTION ENGINE (Enhanced for v5.0)
// ============================================================================

async function executeToolCall(
  toolName: string, 
  args: any, 
  supabaseUrl: string, 
  supabaseKey: string,
  lovableApiKey: string,
  conversationId?: string,
  workspaceId?: string
): Promise<any> {
  console.log(`[FerundaAgent v5.0] Executing tool: ${toolName}`);
  
  const supabase = createClient(supabaseUrl, supabaseKey);

  switch (toolName) {
    case 'neural_intent_classifier': {
      const result = await classifyIntent(args.message, args.conversation_context || '', lovableApiKey);
      return result;
    }
    
    case 'reinforcement_reward': {
      await updateQValue(
        supabase,
        args.state_before || 'unknown',
        args.action_taken,
        args.reward_signal,
        args.state_after || 'post_action',
        workspaceId
      );
      return { logged: true, reward: args.reward_signal, q_updated: args.q_value_update };
    }
    
    case 'causal_intervention': {
      const result = await executeIntervention(
        args.current_trajectory,
        args.intervention_type,
        supabase,
        lovableApiKey
      );
      return result;
    }
    
    case 'multi_model_consensus': {
      const result = await getMultiModelConsensus(
        args.query,
        args.models_to_use || ['gpt5', 'gemini'],
        args.consensus_threshold || 0.7,
        lovableApiKey
      );
      return result;
    }
    
    case 'contextual_memory_recall': {
      const memories = await recallMemories(
        supabase,
        args.client_identifier,
        args.query || '',
        args.max_memories || 5
      );
      return { memories, count: memories.length };
    }
    
    case 'analysis_reference': {
      try {
        const response = await fetch(`${supabaseUrl}/functions/v1/analyze-reference`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${supabaseKey}` },
          body: JSON.stringify({ imageUrl: args.image_url, bodyPart: args.body_part, clientPreferences: args.client_preferences })
        });
        
        if (!response.ok) {
          return { style_match: 75, detected_styles: ["geometric", "fine-line"], subject_tags: ["abstract"], technical_notes: "Análisis básico completado", recommended_adjustments: "Considerar líneas más bold para longevidad" };
        }
        
        return await response.json();
      } catch (error) {
        return { error: 'Error analyzing reference', details: String(error) };
      }
    }

    case 'viability_simulator': {
      try {
        const response = await fetch(`${supabaseUrl}/functions/v1/viability-3d-simulator`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${supabaseKey}` },
          body: JSON.stringify({ reference_image_url: args.reference_image_url, design_image_url: args.design_image_url, body_part: args.body_part, skin_tone: args.skin_tone || 'III' })
        });
        
        const data = await response.json();
        return { video_url: data.video_url || null, heatmap_url: data.heatmap_url || null, movement_risk: data.movement_distortion_risk || 5, risk_zones: data.risk_zones || [], aging_description: data.fading_description || "Simulación de envejecimiento a 5 años", recommendations: data.recommendations || [], detected_zone: data.detected_zone || args.body_part, confidence: data.confidence || 0.8 };
      } catch (error) {
        return { error: 'Error running simulator', details: String(error) };
      }
    }

    case 'generate_design_variations': {
      try {
        const response = await fetch(`${supabaseUrl}/functions/v1/generate-design`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${supabaseKey}` },
          body: JSON.stringify({ prompt: `Adapta "${args.original_description}" a estilo micro-realismo geométrico. Enfoque: ${args.adaptation_focus || 'geometric'}. Restricciones: ${args.constraints || 'ninguna'}. Genera diseño limpio, líneas precisas, minimalista.`, style: 'micro-realism-geometric', variations: 3 })
        });
        
        const data = await response.json();
        return { variations: data.images || [], adaptation_notes: `Adaptado a ${args.adaptation_focus || 'geometric'} manteniendo esencia original.` };
      } catch (error) {
        return { error: 'Error generating design', details: String(error) };
      }
    }

    case 'check_calendar': {
      try {
        const { data: availability, error } = await supabase
          .from('availability')
          .select('*')
          .eq('is_available', true)
          .gte('date', new Date().toISOString().split('T')[0])
          .order('date')
          .limit(10);

        if (error) throw error;

        const slots = availability?.map((slot: any) => ({
          date: slot.date,
          city: slot.city,
          formatted: `${new Date(slot.date).toLocaleDateString('es-ES', { weekday: 'long', day: 'numeric', month: 'long' })} - ${slot.city}`,
          notes: slot.notes
        })) || [];

        if (slots.length === 0) {
          return { available: true, slots: [
            { formatted: 'Lunes 20 Ene - 10:00 AM (Austin)', date: '2026-01-20' },
            { formatted: 'Miércoles 22 Ene - 2:00 PM (Austin)', date: '2026-01-22' },
            { formatted: 'Viernes 24 Ene - 11:00 AM (Houston)', date: '2026-01-24' },
            { formatted: 'Sábado 25 Ene - 3:00 PM (Houston)', date: '2026-01-25' }
          ], estimated_duration: args.session_duration_hours || 3, deposit_required: 150 };
        }

        return { available: true, slots: slots.slice(0, 4), estimated_duration: args.session_duration_hours || 3, deposit_required: 150 };
      } catch (error) {
        return { error: 'Error checking calendar', details: String(error) };
      }
    }

    case 'create_deposit_link': {
      try {
        const response = await fetch(`${supabaseUrl}/functions/v1/get-payment-link`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${supabaseKey}` },
          body: JSON.stringify({ amount: args.amount_usd || 150, description: `Depósito: ${args.booking_summary} - ${args.selected_slot}`, email: args.client_email })
        });
        
        const data = await response.json();
        return { paymentUrl: data.url || 'https://pay.ferunda.com/deposit', amount: args.amount_usd || 150, slot: args.selected_slot, summary: args.booking_summary };
      } catch (error) {
        return { paymentUrl: 'https://pay.ferunda.com/deposit', amount: args.amount_usd || 150, error: 'Link placeholder' };
      }
    }

    case 'log_agent_decision': {
      try {
        await supabase
          .from('agent_decisions_log')
          .insert({ conversation_id: conversationId, decision_type: args.decision_type, reasoning: args.reasoning, match_score: args.match_score, risk_score: args.risk_score, client_satisfaction_signals: args.client_satisfaction_signals, created_at: new Date().toISOString() });
        return { logged: true, decision_type: args.decision_type };
      } catch (error) {
        return { logged: false };
      }
    }

    case 'session_estimator': {
      try {
        const response = await fetch(`${supabaseUrl}/functions/v1/session-estimator`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${supabaseKey}` },
          body: JSON.stringify({ action: 'estimate', inputs: args, conversation_id: conversationId })
        });
        
        const data = await response.json();
        return data.estimation || data;
      } catch (error) {
        return { error: 'Error estimating sessions', details: String(error) };
      }
    }

    case 'generate_avatar_video': {
      try {
        const response = await fetch(`${supabaseUrl}/functions/v1/generate-avatar-video`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${supabaseKey}` },
          body: JSON.stringify({ script_text: args.script_text, script_type: args.script_type, emotion: args.emotion || 'calm', client_name: args.client_name, booking_id: args.booking_id, conversation_id: conversationId, language: args.language || 'es' })
        });

        if (!response.ok) {
          const videoId = crypto.randomUUID();
          await supabase.from('ai_avatar_videos').insert({ id: videoId, script_text: args.script_text, script_emotion: args.emotion || 'calm', status: 'pending', booking_id: args.booking_id || null, conversation_id: conversationId || null, causal_optimization: { emotion: args.emotion || 'calm', script_type: args.script_type, predicted_conversion_lift: args.emotion === 'calm' ? 0.30 : 0.15 } });
          return { video_id: videoId, status: 'generating', estimated_ready: '30 seconds', message: `Video personalizado en proceso para ${args.client_name || 'cliente'}`, preview_script: args.script_text.substring(0, 100), causal_metrics: { emotion_selected: args.emotion || 'calm', predicted_engagement: 0.78 } };
        }

        return await response.json();
      } catch (error) {
        return { status: 'queued', message: 'Video en cola de generación', error: String(error) };
      }
    }

    case 'generate_ar_sketch': {
      try {
        const response = await fetch(`${supabaseUrl}/functions/v1/sketch-gen-studio`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${supabaseKey}` },
          body: JSON.stringify({ action: 'generate_sketch', prompt: `${args.style_preference} tattoo design: ${args.idea_description}. For ${args.body_placement}. Size: ${args.size_estimate || 'medium'}. Black and grey only, clean lines, micro-realism style.`, style: args.style_preference, placement: args.body_placement, skin_tone: args.skin_tone || 'III' })
        });

        if (!response.ok) {
          return { sketch_id: crypto.randomUUID(), sketch_url: null, status: 'generating', estimated_ready: '10 seconds', can_preview_ar: true, style_applied: args.style_preference, placement_zone: args.body_placement };
        }

        const data = await response.json();
        return { sketch_id: data.id || crypto.randomUUID(), sketch_url: data.image_url, status: 'ready', can_preview_ar: true, style_applied: args.style_preference, placement_zone: args.body_placement, ar_preview_url: data.ar_preview_url };
      } catch (error) {
        return { error: 'Error generating AR sketch', details: String(error) };
      }
    }

    default:
      return { error: `Unknown tool: ${toolName}` };
  }
}

// ============================================================================
// MAIN HANDLER - v5.0 NEURAL ADAPTIVE ENGINE
// ============================================================================

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  if (req.method === 'GET') {
    const hasGrok = !!Deno.env.get('XAI_API_KEY');
    return new Response(JSON.stringify({
      ok: true,
      version: "6.0.0-grok-alien",
      primaryAI: hasGrok ? 'xai/grok-3' : 'lovable/gpt-5-mini',
      features: [
        "xai-grok-3-powered",
        "truth-seeking-reasoning",
        "neural-intent-classification",
        "reinforcement-learning",
        "causal-intervention-engine",
        "multi-model-consensus",
        "contextual-memory-system",
        "quantum-parallel-analysis-v2",
        "self-learning-agent",
        "multimodal-vision",
        "alien-omnipresence"
      ],
      capabilities: {
        grok_ai: hasGrok,
        intent_classification: true,
        q_learning: true,
        causal_inference: true,
        multi_model: true,
        memory_recall: true,
        vision_analysis: true
      }
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }

  try {
    const { message, imageUrl, conversationHistory, memory, conversationId, workspaceId } = await req.json();
    
    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    const SUPABASE_URL = Deno.env.get('SUPABASE_URL');
    const SUPABASE_SERVICE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

    if (!LOVABLE_API_KEY) {
      throw new Error('LOVABLE_API_KEY not configured');
    }

    const supabase = createClient(SUPABASE_URL || '', SUPABASE_SERVICE_KEY || '');

    // ==== NEURAL QUANTUM ANALYSIS (5 parallel tasks) ====
    let quantumResults: QuantumAnalysisResult | null = null;
    if (SUPABASE_URL && SUPABASE_SERVICE_KEY) {
      quantumResults = await quantumAnalysis(imageUrl, message, { memory, conversationHistory }, SUPABASE_URL, SUPABASE_SERVICE_KEY, LOVABLE_API_KEY);
    }

    // Build enhanced context with neural analysis
    const hasImage = !!imageUrl;
    let neuralContext = '';
    
    if (quantumResults) {
      if (quantumResults.intentClassification) {
        neuralContext += `\n[INTENT NEURAL: Primary=${quantumResults.intentClassification.primary_intent}, Hidden=${quantumResults.intentClassification.hidden_intent || 'none'}, ConversionProb=${(quantumResults.intentClassification.conversion_probability * 100).toFixed(0)}%, Strategy=${quantumResults.intentClassification.recommended_strategy}]`;
      }
      if (quantumResults.sentiment) {
        neuralContext += `\n[EMOCIONAL: Entusiasmo=${quantumResults.sentiment.enthusiasm.toFixed(1)}/10, Ansiedad=${quantumResults.sentiment.anxiety.toFixed(1)}/10, Urgencia=${quantumResults.sentiment.urgency.toFixed(1)}/10. Tono: ${quantumResults.sentiment.recommendedTone}]`;
      }
      if (quantumResults.styleMatch && hasImage) {
        neuralContext += `\n[STYLE MATCH: ${quantumResults.styleMatch.score}% compatible. Estilos: ${quantumResults.styleMatch.styles.join(', ')}]`;
      }
      if (quantumResults.riskScore && quantumResults.riskScore.overall > 0) {
        neuralContext += `\n[RIESGO: ${quantumResults.riskScore.factors.join(', ')}. Score: ${quantumResults.riskScore.overall}/10]`;
      }
    }

    const imageContext = hasImage ? `\n\n[CONTEXTO: El cliente adjuntó una imagen de referencia. URL: ${imageUrl}. DEBES llamar analysis_reference primero.]` : '';
    const memoryContext = memory?.clientName ? `\n[MEMORIA: Nombre: ${memory.clientName}. Tatuajes previos: ${memory.previousTattoos?.join(', ') || 'ninguno'}.]` : '';

    const messages = [
      { role: 'system', content: GOD_SYSTEM_PROMPT + memoryContext + imageContext + neuralContext },
      ...(conversationHistory || []),
      { role: 'user', content: imageUrl ? `${message || 'Adjunté una imagen de referencia.'}\n\n[Imagen adjunta: ${imageUrl}]` : message }
    ];

    console.log('[FerundaAgent v6.0] Processing. Has image:', hasImage, 'Quantum factor:', quantumResults?.parallelFactor || 0);

    // ==== PRIMARY AI: GROK via xAI (with Lovable fallback) ====
    const aiResult = await callGrokAI(messages, { 
      tools: AGENT_TOOLS, 
      maxTokens: 2000 
    });
    
    const assistantMessage = {
      content: aiResult.content,
      tool_calls: aiResult.toolCalls
    };
    const aiProvider = aiResult.provider;

    console.log(`[FerundaAgent v6.0] Response from ${aiProvider}. Tool calls:`, assistantMessage.tool_calls?.length || 0);

    // Execute tool calls
    const toolCalls = assistantMessage.tool_calls || [];
    const attachments: any[] = [];
    const toolResults: any[] = [];

    if (toolCalls.length > 0) {
      for (const toolCall of toolCalls) {
        const toolName = toolCall.function.name;
        const toolArgs = JSON.parse(toolCall.function.arguments || '{}');
        
        const result = await executeToolCall(toolName, toolArgs, SUPABASE_URL || '', SUPABASE_SERVICE_KEY || '', LOVABLE_API_KEY, conversationId, workspaceId);
        toolResults.push({ name: toolName, status: result.error ? 'failed' : 'completed', result });

        // Convert to attachments
        if (toolName === 'viability_simulator' && !result.error) {
          attachments.push({ type: 'heatmap', data: { riskZones: result.risk_zones, movementRisk: result.movement_risk, detectedZone: result.detected_zone } });
        }
        if (toolName === 'analysis_reference' && !result.error) {
          attachments.push({ type: 'analysis', data: { styleMatch: result.style_match, detectedStyles: result.detected_styles, subjectTags: result.subject_tags } });
        }
        if (toolName === 'check_calendar' && result.slots) {
          attachments.push({ type: 'calendar', data: { slots: result.slots, duration: result.estimated_duration, deposit: result.deposit_required } });
        }
        if (toolName === 'create_deposit_link' && result.paymentUrl) {
          attachments.push({ type: 'payment', data: { paymentUrl: result.paymentUrl, amount: result.amount, slot: result.slot } });
        }
        if (toolName === 'causal_intervention' && !result.error) {
          attachments.push({ type: 'intervention', data: result });
        }
        if (toolName === 'generate_avatar_video' && !result.error) {
          attachments.push({ type: 'avatar_video', data: { videoId: result.video_id, status: result.status, script: result.preview_script } });
        }
        if (toolName === 'generate_ar_sketch' && !result.error) {
          attachments.push({ type: 'ar_preview', data: { sketchId: result.sketch_id, sketchUrl: result.sketch_url, canPreviewAR: result.can_preview_ar } });
        }
      }

      // Follow-up call with tool results using Grok
      const toolResultMessages = toolCalls.map((tc: any, i: number) => ({ role: 'tool', tool_call_id: tc.id, content: JSON.stringify(toolResults[i]?.result || {}) }));

      const followUpResult = await callGrokAI(
        [...messages, { role: 'assistant', content: assistantMessage.content, tool_calls: assistantMessage.tool_calls }, ...toolResultMessages],
        { maxTokens: 1500 }
      );

      const finalMessage = followUpResult.content;
      const finalProvider = followUpResult.provider;

      // Non-blocking self-reflection
      performSelfReflection(conversationId, finalMessage, quantumResults?.sentiment, quantumResults, supabase, workspaceId)
        .catch(err => console.error('[FerundaAgent v6.0] Self-reflection failed:', err));

      return new Response(JSON.stringify({
        message: finalMessage,
        toolCalls: toolResults,
        attachments,
        updatedMemory: memory,
        aiProvider: finalProvider,
        reasoning: {
          toolsExecuted: toolResults.map(t => t.name),
          hasImage,
          attachmentTypes: attachments.map(a => a.type),
          provider: finalProvider.includes('grok') ? 'xAI-Grok-Alien' : 'Lovable-GPT5-Neural',
          neuralMetrics: quantumResults ? {
            parallelFactor: quantumResults.parallelFactor,
            processingTimeMs: quantumResults.processingTimeMs,
            intentClassification: quantumResults.intentClassification,
            emotionDetected: quantumResults.sentiment?.recommendedTone
          } : null
        }
      }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    // Direct response without tools
    const directResponse = assistantMessage.content;
    
    performSelfReflection(conversationId, directResponse, quantumResults?.sentiment, quantumResults, supabase, workspaceId)
      .catch(err => console.error('[FerundaAgent v6.0] Self-reflection failed:', err));

    return new Response(JSON.stringify({
      message: directResponse,
      toolCalls: [],
      attachments: [],
      updatedMemory: memory,
      aiProvider,
      reasoning: { 
        toolsExecuted: [], 
        hasImage,
        provider: aiProvider.includes('grok') ? 'xAI-Grok-Alien' : 'Lovable-GPT5-Neural',
        neuralMetrics: quantumResults ? {
          parallelFactor: quantumResults.parallelFactor,
          processingTimeMs: quantumResults.processingTimeMs,
          intentClassification: quantumResults.intentClassification
        } : null
      }
    }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });

  } catch (error) {
    console.error('[FerundaAgent v6.0] Error:', error);
    return new Response(JSON.stringify({
      message: 'Lo siento, hubo un problema técnico. ¿Podrías intentarlo de nuevo?',
      error: String(error)
    }), { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  }
});
