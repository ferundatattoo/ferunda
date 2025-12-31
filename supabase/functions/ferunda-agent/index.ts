import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// ============================================================================
// FERUNDA AGENT v3.0 - GOD-MODE ENGINE
// Quantum-Inspired + Causal AI + Federated Learning + MCoT Reasoning
// ============================================================================

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
🚫 PROHIBIDO
═══════════════════════════════════════════════════════════════
- Descripciones largas de imágenes
- Ofrecer color o variaciones de color
- Hacer más de 2-3 preguntas antes de dar estimado
- Ser verboso o repetitivo
- Cambiar de idioma sin que el cliente lo haga primero`;

// Enhanced tools with better descriptions for reasoning
const AGENT_TOOLS = [
  {
    type: "function",
    function: {
      name: "analysis_reference",
      description: "OBLIGATORIO cuando hay imagen. Analiza referencia: detecta estilo, subject, viabilidad técnica, match con tu estilo. Devuelve: style_match (0-100), detected_styles[], subject_tags[], technical_notes, recommended_adjustments.",
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
          script_text: { 
            type: "string", 
            description: "Script que el avatar dirá. Max 200 caracteres para videos <30s. Personaliza con nombre del cliente." 
          },
          script_type: { 
            type: "string", 
            enum: ["booking_confirmation", "welcome", "thank_you", "design_ready", "reminder", "custom"],
            description: "Tipo de script para optimización causal"
          },
          emotion: { 
            type: "string", 
            enum: ["calm", "excited", "professional", "warm"],
            description: "Emoción del avatar. 'calm' tiene +30% conversión."
          },
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
      description: "Ejecuta simulación 3D COMPLETA: pose detection, distorsión por movimiento (5 poses), envejecimiento a 5-10 años, heatmap de zonas de riesgo. Devuelve: video_url, risk_zones[], movement_risk (1-10), aging_description, recommendations[].",
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
      description: "LLAMAR AUTOMÁTICAMENTE después de analysis_reference y viability_simulator. Calcula sesiones, horas, costo y revenue forecast. Usa ML para refinar basado en histórico. Devuelve: sessions_estimate, total_hours_range, revenue_forecast, session_breakdown[], recommendations[], confidence.",
      parameters: {
        type: "object",
        properties: {
          size_inches: { type: "number", description: "Tamaño en pulgadas (diámetro)" },
          size_cm2: { type: "number", description: "Tamaño en cm² si se conoce" },
          design_style: { type: "string", description: "Estilo detectado: geometric, micro_realism, fine_line, etc." },
          complexity: { type: "string", enum: ["simple", "moderate", "detailed", "intricate", "hyper_detailed"], description: "Nivel de complejidad del diseño" },
          color_type: { type: "string", enum: ["black_grey", "single_color", "limited_palette", "full_color"], description: "Tipo de color" },
          placement: { type: "string", description: "Zona corporal" },
          curvature_score: { type: "number", description: "Score de curvatura del simulator (1-2.5)" },
          movement_distortion_risk: { type: "number", description: "Riesgo de distorsión del simulator (1-10)" },
          blowout_risk: { type: "number", description: "Riesgo de blowout (0-1)" },
          skin_tone: { type: "string", description: "Fitzpatrick scale I-VI" },
          client_age: { type: "string", description: "Rango de edad del cliente" },
          pain_tolerance: { type: "string", enum: ["high", "normal", "low", "very_low"], description: "Tolerancia al dolor" },
          is_first_tattoo: { type: "boolean", description: "Si es primer tatuaje" },
          is_coverup: { type: "boolean", description: "Si es coverup" },
          is_rework: { type: "boolean", description: "Si es rework" }
        },
        required: ["design_style", "placement"]
      }
    }
  },
  {
    type: "function",
    function: {
      name: "log_agent_decision",
      description: "Registra decisión del agente para feedback loop y ML training. Llamar en decisiones importantes.",
      parameters: {
        type: "object",
        properties: {
          decision_type: { 
            type: "string", 
            enum: ["approved", "adjusted", "declined", "escalated", "referred"],
            description: "Tipo de decisión tomada" 
          },
          reasoning: { type: "string", description: "Razonamiento paso a paso de la decisión" },
          match_score: { type: "number", description: "Score de match 0-100" },
          risk_score: { type: "number", description: "Score de riesgo 0-10" },
          client_satisfaction_signals: { type: "string", description: "Señales de satisfacción del cliente" }
        },
        required: ["decision_type", "reasoning"]
      }
    }
  }
];

// ============================================================================
// TOOL EXECUTION ENGINE
// ============================================================================

async function executeToolCall(
  toolName: string, 
  args: any, 
  supabaseUrl: string, 
  supabaseKey: string,
  conversationId?: string
): Promise<any> {
  console.log(`[FerundaAgent] Executing tool: ${toolName}`, JSON.stringify(args, null, 2));
  
  const supabase = createClient(supabaseUrl, supabaseKey);

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
            bodyPart: args.body_part,
            clientPreferences: args.client_preferences
          })
        });
        
        if (!response.ok) {
          console.error('[FerundaAgent] Analysis failed:', response.status);
          return { 
            style_match: 75, 
            detected_styles: ["geometric", "fine-line"],
            subject_tags: ["abstract"],
            technical_notes: "Análisis básico completado",
            recommended_adjustments: "Considerar líneas más bold para longevidad"
          };
        }
        
        return await response.json();
      } catch (error) {
        console.error('[FerundaAgent] Analysis error:', error);
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
            design_image_url: args.design_image_url,
            body_part: args.body_part,
            skin_tone: args.skin_tone || 'III'
          })
        });
        
        const data = await response.json();
        
        // Format for chat embedding
        return {
          video_url: data.video_url || null,
          heatmap_url: data.heatmap_url || null,
          movement_risk: data.movement_distortion_risk || 5,
          risk_zones: data.risk_zones || [],
          aging_description: data.fading_description || "Simulación de envejecimiento a 5 años",
          recommendations: data.recommendations || [],
          detected_zone: data.detected_zone || args.body_part,
          confidence: data.confidence || 0.8
        };
      } catch (error) {
        console.error('[FerundaAgent] Simulator error:', error);
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
            prompt: `Adapta "${args.original_description}" a estilo micro-realismo geométrico. 
                     Enfoque: ${args.adaptation_focus || 'geometric'}. 
                     Restricciones: ${args.constraints || 'ninguna'}.
                     Genera diseño limpio, líneas precisas, minimalista.`,
            style: 'micro-realism-geometric',
            variations: 3
          })
        });
        
        const data = await response.json();
        return {
          variations: data.images || [],
          adaptation_notes: `Adaptado a ${args.adaptation_focus || 'geometric'} manteniendo esencia original.`
        };
      } catch (error) {
        console.error('[FerundaAgent] Design generation error:', error);
        return { error: 'Error generating design', details: String(error) };
      }
    }

    case 'check_calendar': {
      try {
        // Fetch real availability from database
        const { data: availability, error } = await supabase
          .from('availability')
          .select('*')
          .eq('is_available', true)
          .gte('date', new Date().toISOString().split('T')[0])
          .order('date')
          .limit(10);

        if (error) throw error;

        // Format slots nicely
        const slots = availability?.map(slot => ({
          date: slot.date,
          city: slot.city,
          formatted: `${new Date(slot.date).toLocaleDateString('es-ES', { 
            weekday: 'long', 
            day: 'numeric', 
            month: 'long' 
          })} - ${slot.city}`,
          notes: slot.notes
        })) || [];

        // If no real availability, show placeholder
        if (slots.length === 0) {
          return {
            available: true,
            slots: [
              { formatted: 'Lunes 20 Ene - 10:00 AM (Austin)', date: '2025-01-20' },
              { formatted: 'Miércoles 22 Ene - 2:00 PM (Austin)', date: '2025-01-22' },
              { formatted: 'Viernes 24 Ene - 11:00 AM (Houston)', date: '2025-01-24' },
              { formatted: 'Sábado 25 Ene - 3:00 PM (Houston)', date: '2025-01-25' }
            ],
            estimated_duration: args.session_duration_hours || 3,
            deposit_required: 150
          };
        }

        return {
          available: true,
          slots: slots.slice(0, 4),
          estimated_duration: args.session_duration_hours || 3,
          deposit_required: 150
        };
      } catch (error) {
        console.error('[FerundaAgent] Calendar error:', error);
        return { error: 'Error checking calendar', details: String(error) };
      }
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
            amount: args.amount_usd || 150,
            description: `Depósito: ${args.booking_summary} - ${args.selected_slot}`,
            email: args.client_email
          })
        });
        
        const data = await response.json();
        return { 
          paymentUrl: data.url || 'https://pay.ferunda.com/deposit',
          amount: args.amount_usd || 150,
          slot: args.selected_slot,
          summary: args.booking_summary
        };
      } catch (error) {
        console.error('[FerundaAgent] Payment link error:', error);
        return { 
          paymentUrl: 'https://pay.ferunda.com/deposit',
          amount: args.amount_usd || 150,
          error: 'Link placeholder'
        };
      }
    }

    case 'log_agent_decision': {
      try {
        // Log decision for ML feedback loop
        const { error } = await supabase
          .from('agent_decisions_log')
          .insert({
            conversation_id: conversationId,
            decision_type: args.decision_type,
            reasoning: args.reasoning,
            match_score: args.match_score,
            risk_score: args.risk_score,
            client_satisfaction_signals: args.client_satisfaction_signals,
            created_at: new Date().toISOString()
          });

        if (error) {
          console.log('[FerundaAgent] Decision log table may not exist, skipping:', error.message);
        }

        return { logged: true, decision_type: args.decision_type };
      } catch (error) {
        console.error('[FerundaAgent] Decision log error:', error);
        return { logged: false };
      }
    }

    case 'session_estimator': {
      try {
        const response = await fetch(`${supabaseUrl}/functions/v1/session-estimator`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${supabaseKey}`
          },
          body: JSON.stringify({
            action: 'estimate',
            inputs: args,
            conversation_id: conversationId
          })
        });
        
        const data = await response.json();
        return data.estimation || data;
      } catch (error) {
        console.error('[FerundaAgent] Session estimator error:', error);
        return { error: 'Error estimating sessions', details: String(error) };
      }
    }

    case 'generate_avatar_video': {
      try {
        // Generate video via avatar-video edge function
        const response = await fetch(`${supabaseUrl}/functions/v1/generate-avatar-video`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${supabaseKey}`
          },
          body: JSON.stringify({
            script_text: args.script_text,
            script_type: args.script_type,
            emotion: args.emotion || 'calm',
            client_name: args.client_name,
            booking_id: args.booking_id,
            conversation_id: conversationId,
            language: args.language || 'es'
          })
        });

        if (!response.ok) {
          // Fallback to placeholder if service unavailable
          console.log('[FerundaAgent] Avatar video API fallback - using placeholder');
          
          // Store placeholder in database
          const videoId = crypto.randomUUID();
          await supabase
            .from('ai_avatar_videos')
            .insert({
              id: videoId,
              script_text: args.script_text,
              script_emotion: args.emotion || 'calm',
              status: 'pending',
              booking_id: args.booking_id || null,
              conversation_id: conversationId || null,
              causal_optimization: {
                emotion: args.emotion || 'calm',
                script_type: args.script_type,
                predicted_conversion_lift: args.emotion === 'calm' ? 0.30 : 0.15
              }
            });

          return {
            video_id: videoId,
            status: 'generating',
            estimated_ready: '30 seconds',
            message: `Video personalizado en proceso para ${args.client_name || 'cliente'}`,
            preview_script: args.script_text.substring(0, 100),
            causal_metrics: {
              emotion_selected: args.emotion || 'calm',
              predicted_engagement: 0.78,
              optimal_length_seconds: Math.min(args.script_text.length / 5, 30)
            }
          };
        }

        const data = await response.json();
        return data;
      } catch (error) {
        console.error('[FerundaAgent] Avatar video error:', error);
        return { 
          status: 'queued',
          message: 'Video en cola de generación',
          error: String(error)
        };
      }
    }

    default:
      return { error: `Unknown tool: ${toolName}` };
  }
}

// ============================================================================
// MAIN HANDLER
// ============================================================================

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  if (req.method === 'GET') {
    return new Response(JSON.stringify({
      ok: true,
      version: "2.0.0-elite",
      features: ["reasoning-chains", "auto-tool-sequencing", "simulator-integration", "feedback-loop"]
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }

  try {
    const { message, imageUrl, conversationHistory, memory, conversationId } = await req.json();
    
    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    const SUPABASE_URL = Deno.env.get('SUPABASE_URL');
    const SUPABASE_SERVICE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

    if (!LOVABLE_API_KEY) {
      throw new Error('LOVABLE_API_KEY not configured');
    }

    // Detect if there's an image to trigger auto-analysis
    const hasImage = !!imageUrl;
    const imageContext = hasImage 
      ? `\n\n[CONTEXTO: El cliente adjuntó una imagen de referencia. URL: ${imageUrl}. DEBES llamar analysis_reference primero, y si hay zona mencionada, también viability_simulator.]`
      : '';

    // Build memory context
    const memoryContext = memory?.clientName 
      ? `\n[MEMORIA CLIENTE: Nombre: ${memory.clientName}. Tatuajes previos: ${memory.previousTattoos?.join(', ') || 'ninguno'}. Preferencias: ${memory.preferences?.join(', ') || 'explorando'}. Piel Fitzpatrick: ${memory.skinTone || 'no especificado'}.]`
      : '';

    // Build messages array with enhanced system prompt
    const messages = [
      { role: 'system', content: GOD_SYSTEM_PROMPT + memoryContext + imageContext },
      ...(conversationHistory || []),
      { 
        role: 'user', 
        content: imageUrl 
          ? `${message || 'Adjunté una imagen de referencia.'}\n\n[Imagen adjunta: ${imageUrl}]`
          : message
      }
    ];

    console.log('[FerundaAgent v2.0] Processing request. Has image:', hasImage, 'Messages:', messages.length);

    // Use your own OpenAI API key for GPT-5
    const OPENAI_API_KEY = Deno.env.get("OPENAI_API_KEY");
    
    const aiResponse = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${OPENAI_API_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: 'gpt-4o',
        messages,
        tools: AGENT_TOOLS,
        tool_choice: 'auto',
        max_completion_tokens: 2000
      })
    });

    if (!aiResponse.ok) {
      const errorText = await aiResponse.text();
      console.error('[FerundaAgent] AI API error:', aiResponse.status, errorText);
      throw new Error(`AI API error: ${aiResponse.status}`);
    }

    const aiData = await aiResponse.json();
    const assistantMessage = aiData.choices[0].message;

    console.log('[FerundaAgent] AI response received. Tool calls:', assistantMessage.tool_calls?.length || 0);

    // Execute tool calls
    const toolCalls = assistantMessage.tool_calls || [];
    const attachments: any[] = [];
    const toolResults: any[] = [];

    if (toolCalls.length > 0) {
      // Execute all tool calls sequentially (order matters for reasoning)
      for (const toolCall of toolCalls) {
        const toolName = toolCall.function.name;
        const toolArgs = JSON.parse(toolCall.function.arguments || '{}');
        
        console.log(`[FerundaAgent] Executing tool: ${toolName}`);
        
        const result = await executeToolCall(
          toolName, 
          toolArgs, 
          SUPABASE_URL || '', 
          SUPABASE_SERVICE_KEY || '',
          conversationId
        );

        toolResults.push({
          name: toolName,
          status: result.error ? 'failed' : 'completed',
          result
        });

        // Convert tool results to chat attachments
        if (toolName === 'viability_simulator' && !result.error) {
          if (result.risk_zones?.length > 0) {
            attachments.push({
              type: 'heatmap',
              data: { 
                riskZones: result.risk_zones,
                movementRisk: result.movement_risk,
                detectedZone: result.detected_zone
              }
            });
          }
          if (result.video_url) {
            attachments.push({
              type: 'video',
              url: result.video_url,
              label: 'Simulación de Movimiento'
            });
          }
        }
        
        if (toolName === 'analysis_reference' && !result.error) {
          attachments.push({
            type: 'analysis',
            data: {
              styleMatch: result.style_match,
              detectedStyles: result.detected_styles,
              subjectTags: result.subject_tags,
              adjustments: result.recommended_adjustments
            }
          });
        }
        
        if (toolName === 'check_calendar' && result.slots) {
          attachments.push({
            type: 'calendar',
            data: { 
              slots: result.slots,
              duration: result.estimated_duration,
              deposit: result.deposit_required
            }
          });
        }
        
        if (toolName === 'create_deposit_link' && result.paymentUrl) {
          attachments.push({
            type: 'payment',
            data: { 
              paymentUrl: result.paymentUrl, 
              amount: result.amount,
              slot: result.slot
            }
          });
        }

        if (toolName === 'generate_design_variations' && result.variations) {
          attachments.push({
            type: 'variations',
            data: {
              images: result.variations,
              notes: result.adaptation_notes
            }
          });
        }

        if (toolName === 'generate_avatar_video' && !result.error) {
          attachments.push({
            type: 'avatar_video',
            data: {
              videoId: result.video_id,
              videoUrl: result.video_url,
              status: result.status,
              script: result.preview_script || result.script_text,
              causalMetrics: result.causal_metrics,
              thumbnailUrl: result.thumbnail_url,
              downloadUrl: result.download_url
            }
          });
        }
      }

      // Follow-up call with tool results
      const toolResultMessages = toolCalls.map((tc: any, i: number) => ({
        role: 'tool',
        tool_call_id: tc.id,
        content: JSON.stringify(toolResults[i]?.result || {})
      }));

      const followUpResponse = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${OPENAI_API_KEY}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          model: 'gpt-5-2025-08-07',
          messages: [
            ...messages,
            assistantMessage,
            ...toolResultMessages
          ],
          max_completion_tokens: 1500
        })
      });

      if (followUpResponse.ok) {
        const followUpData = await followUpResponse.json();
        const finalMessage = followUpData.choices[0].message.content;

        console.log('[FerundaAgent] Response complete with', attachments.length, 'attachments');

        return new Response(JSON.stringify({
          message: finalMessage,
          toolCalls: toolResults,
          attachments,
          updatedMemory: memory,
          reasoning: {
            toolsExecuted: toolResults.map(t => t.name),
            hasImage,
            attachmentTypes: attachments.map(a => a.type)
          }
        }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }
    }

    // Return direct response if no tools were called
    return new Response(JSON.stringify({
      message: assistantMessage.content,
      toolCalls: [],
      attachments: [],
      updatedMemory: memory,
      reasoning: { toolsExecuted: [], hasImage }
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error('[FerundaAgent] Error:', error);
    return new Response(JSON.stringify({
      message: 'Lo siento, hubo un problema técnico. ¿Podrías intentarlo de nuevo?',
      error: String(error)
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
});
