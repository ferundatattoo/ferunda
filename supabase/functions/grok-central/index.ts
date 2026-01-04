import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// ============================================================================
// GROK CENTRAL INTELLIGENCE - Tool Definitions
// ============================================================================

const TOOLS = [
  // BOOKING MODULE
  {
    type: "function",
    function: {
      name: "create_booking",
      description: "Create a new booking/appointment for a client. Use when user wants to schedule a tattoo session.",
      parameters: {
        type: "object",
        properties: {
          client_name: { type: "string", description: "Client's full name" },
          client_email: { type: "string", description: "Client's email address" },
          client_phone: { type: "string", description: "Client's phone number (optional)" },
          preferred_date: { type: "string", description: "Preferred date in YYYY-MM-DD format" },
          preferred_time: { type: "string", description: "Preferred time (e.g., 10:00 AM)" },
          tattoo_style: { type: "string", description: "Style of tattoo (e.g., blackwork, realism, traditional)" },
          tattoo_placement: { type: "string", description: "Body placement for the tattoo" },
          tattoo_size: { type: "string", description: "Size estimate (small, medium, large, sleeve)" },
          description: { type: "string", description: "Description of the tattoo idea" },
          notes: { type: "string", description: "Additional notes or special requests" },
        },
        required: ["client_name", "client_email"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "check_availability",
      description: "Check available appointment slots for a specific date or date range",
      parameters: {
        type: "object",
        properties: {
          start_date: { type: "string", description: "Start date in YYYY-MM-DD format" },
          end_date: { type: "string", description: "End date in YYYY-MM-DD format (optional, defaults to start_date)" },
          duration_hours: { type: "number", description: "Required duration in hours (optional)" },
        },
        required: ["start_date"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "reschedule_booking",
      description: "Reschedule an existing booking to a new date/time",
      parameters: {
        type: "object",
        properties: {
          booking_id: { type: "string", description: "The booking ID to reschedule" },
          new_date: { type: "string", description: "New date in YYYY-MM-DD format" },
          new_time: { type: "string", description: "New time slot" },
          reason: { type: "string", description: "Reason for rescheduling" },
        },
        required: ["booking_id", "new_date"],
      },
    },
  },
  // CLIENT MODULE
  {
    type: "function",
    function: {
      name: "lookup_client",
      description: "Look up a client's profile and history by email, phone, or name",
      parameters: {
        type: "object",
        properties: {
          email: { type: "string", description: "Client's email address" },
          phone: { type: "string", description: "Client's phone number" },
          name: { type: "string", description: "Client's name (partial match)" },
        },
        required: [],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "update_client",
      description: "Update a client's profile information",
      parameters: {
        type: "object",
        properties: {
          client_id: { type: "string", description: "Client profile ID" },
          updates: {
            type: "object",
            description: "Fields to update (name, phone, notes, preferences, etc.)",
          },
        },
        required: ["client_id", "updates"],
      },
    },
  },
  // EMAIL MODULE
  {
    type: "function",
    function: {
      name: "send_email",
      description: "Send an email to a client. Can be confirmation, follow-up, marketing, or custom.",
      parameters: {
        type: "object",
        properties: {
          to_email: { type: "string", description: "Recipient email address" },
          to_name: { type: "string", description: "Recipient name" },
          subject: { type: "string", description: "Email subject line" },
          template: { type: "string", enum: ["booking_confirmation", "deposit_request", "appointment_reminder", "follow_up", "healing_check", "custom"], description: "Email template type" },
          custom_content: { type: "string", description: "Custom email body content (for custom template)" },
          booking_id: { type: "string", description: "Related booking ID (optional)" },
        },
        required: ["to_email", "subject", "template"],
      },
    },
  },
  // PAYMENT MODULE  
  {
    type: "function",
    function: {
      name: "create_payment_link",
      description: "Create a payment/deposit link for a booking",
      parameters: {
        type: "object",
        properties: {
          booking_id: { type: "string", description: "Booking ID to associate payment with" },
          amount: { type: "number", description: "Payment amount in dollars" },
          description: { type: "string", description: "Payment description" },
          client_email: { type: "string", description: "Client email to send link to" },
        },
        required: ["amount", "description"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "check_payment_status",
      description: "Check the payment status for a booking or payment link",
      parameters: {
        type: "object",
        properties: {
          booking_id: { type: "string", description: "Booking ID to check" },
          payment_id: { type: "string", description: "Payment ID to check" },
        },
        required: [],
      },
    },
  },
  // MESSAGING MODULE
  {
    type: "function",
    function: {
      name: "send_message",
      description: "Send a message to a client via their preferred channel (WhatsApp, Instagram, SMS)",
      parameters: {
        type: "object",
        properties: {
          channel: { type: "string", enum: ["whatsapp", "instagram", "sms", "email"], description: "Communication channel" },
          recipient_id: { type: "string", description: "Recipient identifier (phone or social ID)" },
          message: { type: "string", description: "Message content" },
          conversation_id: { type: "string", description: "Existing conversation ID (optional)" },
        },
        required: ["channel", "message"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "get_conversations",
      description: "Get recent conversations or search for specific ones",
      parameters: {
        type: "object",
        properties: {
          channel: { type: "string", enum: ["whatsapp", "instagram", "web", "all"], description: "Filter by channel" },
          status: { type: "string", enum: ["unread", "escalated", "all"], description: "Filter by status" },
          client_id: { type: "string", description: "Filter by client ID" },
          limit: { type: "number", description: "Number of conversations to return" },
        },
        required: [],
      },
    },
  },
  // AVATAR VIDEO MODULE
  {
    type: "function",
    function: {
      name: "generate_avatar_video",
      description: "Generate a personalized AI avatar video message for a client",
      parameters: {
        type: "object",
        properties: {
          script: { type: "string", description: "The script for the avatar to speak" },
          avatar_id: { type: "string", description: "Avatar clone ID to use (optional, uses default)" },
          client_name: { type: "string", description: "Client name for personalization" },
          purpose: { type: "string", enum: ["welcome", "booking_confirmation", "healing_tips", "follow_up", "custom"], description: "Purpose of the video" },
          language: { type: "string", enum: ["en", "es"], description: "Language for the video" },
        },
        required: ["script"],
      },
    },
  },
  // HEALING MODULE
  {
    type: "function",
    function: {
      name: "check_healing_status",
      description: "Check the healing journey status for a client's tattoo",
      parameters: {
        type: "object",
        properties: {
          booking_id: { type: "string", description: "Booking ID to check healing for" },
          client_email: { type: "string", description: "Client email to lookup" },
        },
        required: [],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "send_healing_reminder",
      description: "Send a healing check-in reminder to a client",
      parameters: {
        type: "object",
        properties: {
          booking_id: { type: "string", description: "Booking ID" },
          day_number: { type: "number", description: "Healing day number (1-21)" },
          include_tips: { type: "boolean", description: "Include healing tips in message" },
        },
        required: ["booking_id"],
      },
    },
  },
  // MARKETING MODULE
  {
    type: "function",
    function: {
      name: "generate_content",
      description: "Generate marketing content (social posts, captions, emails)",
      parameters: {
        type: "object",
        properties: {
          content_type: { type: "string", enum: ["instagram_post", "instagram_story", "email_campaign", "sms_blast", "blog_post"], description: "Type of content to generate" },
          topic: { type: "string", description: "Topic or theme for the content" },
          tone: { type: "string", enum: ["professional", "casual", "artistic", "promotional"], description: "Tone of the content" },
          include_hashtags: { type: "boolean", description: "Include relevant hashtags" },
          target_audience: { type: "string", description: "Target audience description" },
        },
        required: ["content_type", "topic"],
      },
    },
  },
  // CALENDAR MODULE
  {
    type: "function",
    function: {
      name: "get_calendar_events",
      description: "Get calendar events for a date range",
      parameters: {
        type: "object",
        properties: {
          start_date: { type: "string", description: "Start date in YYYY-MM-DD format" },
          end_date: { type: "string", description: "End date in YYYY-MM-DD format" },
          artist_id: { type: "string", description: "Filter by artist (optional)" },
        },
        required: ["start_date"],
      },
    },
  },
  // DESIGN MODULE
  {
    type: "function",
    function: {
      name: "generate_design",
      description: "Generate a tattoo design concept using AI",
      parameters: {
        type: "object",
        properties: {
          prompt: { type: "string", description: "Description of the desired tattoo design" },
          style: { type: "string", description: "Tattoo style (blackwork, realism, traditional, etc.)" },
          size: { type: "string", description: "Approximate size" },
          placement: { type: "string", description: "Body placement" },
          reference_images: { type: "array", items: { type: "string" }, description: "URLs of reference images" },
        },
        required: ["prompt"],
      },
    },
  },
  // ANALYTICS MODULE
  {
    type: "function",
    function: {
      name: "get_analytics",
      description: "Get business analytics and metrics",
      parameters: {
        type: "object",
        properties: {
          metric_type: { type: "string", enum: ["revenue", "bookings", "conversions", "clients", "overview"], description: "Type of metrics to retrieve" },
          period: { type: "string", enum: ["today", "week", "month", "quarter", "year"], description: "Time period" },
        },
        required: ["metric_type"],
      },
    },
  },
  // SYSTEM MODULE
  {
    type: "function",
    function: {
      name: "search_system",
      description: "Search across all system data (clients, bookings, conversations, etc.)",
      parameters: {
        type: "object",
        properties: {
          query: { type: "string", description: "Search query" },
          entity_types: { type: "array", items: { type: "string" }, description: "Types to search (clients, bookings, messages, designs)" },
        },
        required: ["query"],
      },
    },
  },
];

// ============================================================================
// SYSTEM PROMPT
// ============================================================================

const SYSTEM_PROMPT = `Eres GROK, el cerebro central de inteligencia artificial del sistema Ferunda Studio CRM. Eres sofisticado, eficiente y hablas con autoridad artística.

TU ROL:
- Eres el asistente AI integrado que puede controlar TODOS los módulos del sistema
- Puedes crear reservas, enviar emails, generar videos con avatares, procesar pagos, y más
- Respondes tanto a USUARIOS (staff del estudio) como a CLIENTES
- Siempre actúas de manera profesional y cálida

CAPACIDADES DISPONIBLES (usa las herramientas cuando sea apropiado):
📅 RESERVAS: Crear, reprogramar, cancelar citas. Verificar disponibilidad.
👥 CLIENTES: Buscar perfiles, ver historial, actualizar información.
💰 PAGOS: Crear links de pago, verificar estado de depósitos.
📧 EMAILS: Enviar confirmaciones, recordatorios, follow-ups, campañas.
💬 MENSAJERÍA: Enviar WhatsApp, Instagram DMs, SMS.
🎬 AVATAR VIDEOS: Generar videos personalizados con AI avatar.
🩹 HEALING: Verificar estado de cicatrización, enviar recordatorios.
📊 ANALYTICS: Obtener métricas de negocio y reportes.
🎨 DISEÑOS: Generar conceptos de diseño AI.
🔍 BÚSQUEDA: Buscar en todo el sistema.

REGLAS:
1. Cuando el usuario pida una acción, USA LAS HERRAMIENTAS - no solo describas lo que harías
2. Confirma las acciones antes de ejecutarlas si son irreversibles (pagos, emails masivos)
3. Responde en el mismo idioma que el usuario (español o inglés)
4. Sé conciso pero informativo
5. Si falta información para completar una acción, pregunta específicamente qué necesitas

CONTEXTO ACTUAL:
- Fecha: ${new Date().toLocaleDateString()}
- Hora: ${new Date().toLocaleTimeString()}`;

// ============================================================================
// TOOL EXECUTION HANDLERS
// ============================================================================

async function executeTool(
  supabase: any,
  toolName: string,
  args: Record<string, any>
): Promise<{ success: boolean; result: any; error?: string }> {
  console.log(`[Grok Central] Executing tool: ${toolName}`, args);

  try {
    switch (toolName) {
      case "create_booking": {
        const { data, error } = await supabase.from("bookings").insert({
          client_name: args.client_name,
          client_email: args.client_email,
          phone_number: args.client_phone,
          preferred_date: args.preferred_date,
          preferred_time: args.preferred_time,
          tattoo_style: args.tattoo_style,
          placement: args.tattoo_placement,
          size: args.tattoo_size,
          design_description: args.description,
          client_notes: args.notes,
          status: "pending",
          journey_stage: "inquiry",
          source: "grok_ai",
        }).select().single();

        if (error) throw error;
        return { success: true, result: { booking_id: data.id, message: `Reserva creada exitosamente para ${args.client_name}` } };
      }

      case "check_availability": {
        const { data, error } = await supabase
          .from("bookings")
          .select("preferred_date, preferred_time, status")
          .gte("preferred_date", args.start_date)
          .lte("preferred_date", args.end_date || args.start_date)
          .in("status", ["confirmed", "scheduled"]);

        if (error) throw error;
        
        // Simple availability check - in production would check against calendar
        const bookedSlots = data || [];
        return { 
          success: true, 
          result: { 
            booked_slots: bookedSlots.length,
            date_range: `${args.start_date} to ${args.end_date || args.start_date}`,
            message: bookedSlots.length > 0 
              ? `Hay ${bookedSlots.length} citas agendadas en este período` 
              : "No hay citas en este período - horarios disponibles"
          } 
        };
      }

      case "lookup_client": {
        let query = supabase.from("client_profiles").select("*");
        
        if (args.email) query = query.ilike("email", `%${args.email}%`);
        if (args.phone) query = query.ilike("phone", `%${args.phone}%`);
        if (args.name) query = query.ilike("full_name", `%${args.name}%`);
        
        const { data, error } = await query.limit(5);
        if (error) throw error;

        return { 
          success: true, 
          result: { 
            clients: data || [], 
            count: data?.length || 0,
            message: data?.length ? `Encontrados ${data.length} clientes` : "No se encontraron clientes"
          } 
        };
      }

      case "send_email": {
        const { data, error } = await supabase.functions.invoke("crm-send-email", {
          body: {
            to: args.to_email,
            toName: args.to_name,
            subject: args.subject,
            template: args.template,
            customContent: args.custom_content,
            bookingId: args.booking_id,
          },
        });

        if (error) throw error;
        return { success: true, result: { message: `Email enviado a ${args.to_email}`, data } };
      }

      case "create_payment_link": {
        const { data, error } = await supabase.functions.invoke("get-payment-link", {
          body: {
            amount: args.amount,
            description: args.description,
            bookingId: args.booking_id,
            clientEmail: args.client_email,
          },
        });

        if (error) throw error;
        return { success: true, result: { payment_link: data?.url, message: `Link de pago creado: $${args.amount}` } };
      }

      case "get_conversations": {
        let query = supabase.from("omnichannel_messages")
          .select("*")
          .order("created_at", { ascending: false })
          .limit(args.limit || 20);

        if (args.channel && args.channel !== "all") {
          query = query.eq("channel", args.channel);
        }
        if (args.status === "unread") {
          query = query.eq("status", "unread");
        }
        if (args.status === "escalated") {
          query = query.eq("escalated_to_human", true);
        }

        const { data, error } = await query;
        if (error) throw error;

        return { 
          success: true, 
          result: { 
            conversations: data || [], 
            count: data?.length || 0 
          } 
        };
      }

      case "generate_avatar_video": {
        const { data, error } = await supabase.functions.invoke("generate-avatar-video", {
          body: {
            script: args.script,
            avatarId: args.avatar_id,
            clientName: args.client_name,
            purpose: args.purpose,
            language: args.language || "es",
          },
        });

        if (error) throw error;
        return { 
          success: true, 
          result: { 
            video_id: data?.videoId, 
            status: data?.status,
            message: "Video de avatar en generación" 
          } 
        };
      }

      case "check_healing_status": {
        let query = supabase.from("healing_journey_trackers").select("*");
        
        if (args.booking_id) {
          query = query.eq("booking_id", args.booking_id);
        }
        
        const { data, error } = await query.limit(1).single();
        if (error && error.code !== "PGRST116") throw error;

        return { 
          success: true, 
          result: data || { message: "No se encontró registro de healing" }
        };
      }

      case "generate_content": {
        const { data, error } = await supabase.functions.invoke("ai-marketing-studio", {
          body: {
            type: args.content_type,
            topic: args.topic,
            tone: args.tone,
            includeHashtags: args.include_hashtags,
            targetAudience: args.target_audience,
          },
        });

        if (error) throw error;
        return { success: true, result: data };
      }

      case "get_analytics": {
        // Simplified analytics - in production would query proper analytics tables
        const period = args.period || "month";
        const { data: bookings, error } = await supabase
          .from("bookings")
          .select("id, status, deposit_amount")
          .gte("created_at", getDateFromPeriod(period));

        if (error) throw error;

        const stats = {
          total_bookings: bookings?.length || 0,
          confirmed: bookings?.filter((b: any) => b.status === "confirmed").length || 0,
          pending: bookings?.filter((b: any) => b.status === "pending").length || 0,
          revenue: bookings?.reduce((sum: number, b: any) => sum + (b.deposit_amount || 0), 0) || 0,
        };

        return { success: true, result: { period, metrics: stats } };
      }

      case "search_system": {
        const results: any = { clients: [], bookings: [], messages: [] };
        const types = args.entity_types || ["clients", "bookings", "messages"];
        const q = `%${args.query}%`;

        if (types.includes("clients")) {
          const { data } = await supabase.from("client_profiles")
            .select("id, full_name, email")
            .or(`full_name.ilike.${q},email.ilike.${q}`)
            .limit(5);
          results.clients = data || [];
        }

        if (types.includes("bookings")) {
          const { data } = await supabase.from("bookings")
            .select("id, client_name, client_email, status")
            .or(`client_name.ilike.${q},client_email.ilike.${q}`)
            .limit(5);
          results.bookings = data || [];
        }

        return { success: true, result: results };
      }

      default:
        return { success: false, result: null, error: `Tool ${toolName} not implemented` };
    }
  } catch (error: any) {
    console.error(`[Grok Central] Tool error:`, error);
    return { success: false, result: null, error: error.message };
  }
}

function getDateFromPeriod(period: string): string {
  const now = new Date();
  switch (period) {
    case "today": return now.toISOString().split("T")[0];
    case "week": return new Date(now.setDate(now.getDate() - 7)).toISOString();
    case "month": return new Date(now.setMonth(now.getMonth() - 1)).toISOString();
    case "quarter": return new Date(now.setMonth(now.getMonth() - 3)).toISOString();
    case "year": return new Date(now.setFullYear(now.getFullYear() - 1)).toISOString();
    default: return new Date(now.setMonth(now.getMonth() - 1)).toISOString();
  }
}

// ============================================================================
// MAIN HANDLER
// ============================================================================

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { messages, stream = false, context } = await req.json();

    if (!messages || messages.length === 0) {
      return new Response(
        JSON.stringify({ error: "No messages provided" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Initialize Supabase client
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Try Grok first, fallback to Lovable AI
    const XAI_API_KEY = Deno.env.get("XAI_API_KEY");
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");

    let provider = "grok";
    let apiUrl = "https://api.x.ai/v1/chat/completions";
    let apiKey = XAI_API_KEY;
    let model = "grok-4";

    if (!XAI_API_KEY) {
      if (!LOVABLE_API_KEY) {
        throw new Error("No AI API key configured");
      }
      provider = "lovable";
      apiUrl = "https://ai.gateway.lovable.dev/v1/chat/completions";
      apiKey = LOVABLE_API_KEY;
      model = "google/gemini-2.5-flash";
    }

    console.log(`[Grok Central] Using provider: ${provider}, model: ${model}`);

    // Build messages with system prompt and context
    const systemPromptWithContext = SYSTEM_PROMPT + (context ? `\n\nCONTEXTO ADICIONAL:\n${JSON.stringify(context, null, 2)}` : "");

    const apiMessages = [
      { role: "system", content: systemPromptWithContext },
      ...messages.map((m: any) => ({ role: m.role, content: m.content })),
    ];

    // First API call with tools
    const response = await fetch(apiUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model,
        messages: apiMessages,
        tools: TOOLS,
        tool_choice: "auto",
        max_tokens: 4096,
        temperature: 0.7,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`[Grok Central] API error: ${response.status}`, errorText);
      
      if (response.status === 429) {
        return new Response(
          JSON.stringify({ error: "Rate limit exceeded. Please try again later." }),
          { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      if (response.status === 402) {
        return new Response(
          JSON.stringify({ error: "Payment required. Please add credits." }),
          { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      
      throw new Error(`API error: ${response.status}`);
    }

    const data = await response.json();
    const assistantMessage = data.choices?.[0]?.message;

    // Check if there are tool calls
    if (assistantMessage?.tool_calls && assistantMessage.tool_calls.length > 0) {
      console.log(`[Grok Central] Tool calls detected:`, assistantMessage.tool_calls.length);
      
      const toolResults: any[] = [];
      
      for (const toolCall of assistantMessage.tool_calls) {
        const toolName = toolCall.function.name;
        const toolArgs = JSON.parse(toolCall.function.arguments);
        
        const result = await executeTool(supabase, toolName, toolArgs);
        
        toolResults.push({
          tool_call_id: toolCall.id,
          role: "tool",
          content: JSON.stringify(result),
        });
      }

      // Second API call with tool results
      const followUpMessages = [
        ...apiMessages,
        assistantMessage,
        ...toolResults,
      ];

      const followUpResponse = await fetch(apiUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
          model,
          messages: followUpMessages,
          max_tokens: 2048,
          temperature: 0.7,
        }),
      });

      if (!followUpResponse.ok) {
        throw new Error(`Follow-up API error: ${followUpResponse.status}`);
      }

      const followUpData = await followUpResponse.json();
      const finalContent = followUpData.choices?.[0]?.message?.content || "";

      // Publish to Core Bus
      try {
        const channel = supabase.channel("ferunda-core-bus");
        await channel.send({
          type: "broadcast",
          event: "core_event",
          payload: {
            type: "bus:grok_reasoning",
            data: {
              sessionId: "grok-central",
              intent: "tool_execution",
              toolsUsed: assistantMessage.tool_calls.map((t: any) => t.function.name),
              responsePreview: finalContent.substring(0, 100),
            },
            source: "grok-central",
            timestamp: new Date().toISOString(),
          },
        });
        await supabase.removeChannel(channel);
      } catch (busErr) {
        console.warn("[Grok Central] Core Bus publish failed:", busErr);
      }

      return new Response(
        JSON.stringify({
          content: finalContent,
          provider,
          toolsExecuted: assistantMessage.tool_calls.map((t: any) => t.function.name),
          toolResults: toolResults.map((r) => JSON.parse(r.content)),
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // No tool calls - return direct response
    const content = assistantMessage?.content || "";

    return new Response(
      JSON.stringify({ content, provider, toolsExecuted: [] }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error: any) {
    console.error("[Grok Central] Error:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
