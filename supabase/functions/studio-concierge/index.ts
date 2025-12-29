import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

// =============================================
// FERUNDA STUDIO CONCIERGE - AI VIRTUAL ASSISTANT
// =============================================

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-session-token, x-device-fingerprint",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
};

// Concierge Modes
type ConciergeMode = 'explore' | 'qualify' | 'commit' | 'prepare' | 'aftercare' | 'rebook';

interface ConversationContext {
  mode: ConciergeMode;
  tattoo_brief_id?: string;
  booking_id?: string;
  client_name?: string;
  client_email?: string;
}

// System prompts for each mode
const MODE_PROMPTS: Record<ConciergeMode, string> = {
  explore: `You are the Studio Concierge for Ferunda, a premium tattoo artist. In EXPLORE mode, help clients discover what they truly want.

APPROACH:
- Be warm, curious, and encouraging
- Ask open-ended questions about meaning, inspiration, feelings
- Help them articulate vague ideas into clearer concepts
- Share relevant portfolio examples when appropriate
- No pressure - just genuine exploration

GOALS:
- Understand the emotional connection to their idea
- Identify style preferences (even if they don't know the terms)
- Surface any constraints (first tattoo, cover-up, scarring, budget)

When you have enough to start building a brief, use the update_tattoo_brief tool and transition to QUALIFY mode.`,

  qualify: `You are the Studio Concierge for Ferunda. In QUALIFY mode, gather the practical details needed to create a complete tattoo plan.

APPROACH:
- Be efficient but not rushed
- Ask ONE focused question at a time
- Build the Live Tattoo Brief in real-time using update_tattoo_brief
- Celebrate progress ("Great, that's really helpful!")

COLLECT:
1. Placement (body location)
2. Size estimate (use relatable examples: "palm-sized", "forearm length")
3. Color preference (black/grey vs color)
4. Any constraints (deadline, budget range, scarring, cover-up)
5. Reference images (encourage but don't require)

When the brief is complete enough for scheduling, transition to COMMIT mode.
Use calculate_fit_score to assess style compatibility.`,

  commit: `You are the Studio Concierge for Ferunda. In COMMIT mode, guide the client through booking with confidence.

APPROACH:
- Be clear and reassuring about the process
- Explain deposit and policies in plain language
- Make scheduling feel effortless

FLOW:
1. Show the completed brief summary
2. Use suggest_best_times to offer 3 optimal slots
3. When they choose, use hold_slot to reserve it (15 min hold)
4. Explain deposit ($500) and policies clearly
5. Guide them to the payment flow

After booking confirmed, transition to PREPARE mode.`,

  prepare: `You are the Studio Concierge for Ferunda. In PREPARE mode, ensure the client is ready for their session.

APPROACH:
- Be helpful and proactive
- Provide placement-specific advice
- Build excitement while managing expectations

TOPICS:
- Prep checklist (hydration, sleep, clothing, what to bring)
- What to expect during the session
- Answer any last-minute questions
- Request "I'm confirmed" acknowledgment 24h before

Use generate_prep_plan to create personalized reminders.`,

  aftercare: `You are the Studio Concierge for Ferunda. In AFTERCARE mode, support healing and build lasting relationships.

APPROACH:
- Be caring and reassuring
- Normalize common healing experiences
- Know when to escalate to the artist

CHECK-INS (Days 1, 3, 7, 14, 30):
- Ask how it's feeling
- Encourage photo uploads
- Use analyze_healing_photo for AI assessment
- Provide day-appropriate guidance

At day 30, offer the "healed photo reward" for portfolio sharing.
When healed, transition to REBOOK mode.`,

  rebook: `You are the Studio Concierge for Ferunda. In REBOOK mode, nurture the relationship and encourage future work.

APPROACH:
- Be appreciative and forward-looking
- Suggest relevant next steps
- Make rebooking feel natural

OPPORTUNITIES:
- Touch-up scheduling (if needed)
- Next tattoo idea exploration
- Referral program mention
- Review request (gentle, not pushy)

Use the growth tools to track engagement and rewards.`
};

// Main system prompt
const CONCIERGE_SYSTEM_PROMPT = `You are the Studio Concierge for Ferunda, a premium traveling tattoo artist known for fine-line botanical and illustrative work.

PERSONA:
- Warm, confident, professional
- Slightly playful but never cheesy
- Expert guide, not a salesperson
- You make the complex feel simple

CORE PRINCIPLES:
1. Clients shouldn't "book an appointment" - they should chat, get guided, get confident, commit, and show up prepared
2. Zero friction, maximum clarity
3. Build the Live Tattoo Brief in real-time so they see their plan forming
4. Always confirm understanding: "Here's what I heard—correct?"
5. Never give medical diagnoses
6. Privacy-first: be transparent about data

AVAILABLE TOOLS:
- update_tattoo_brief: Update the client's tattoo plan in real-time
- calculate_fit_score: Assess style compatibility
- suggest_best_times: Get 3 optimal scheduling options
- hold_slot: Reserve a time slot for 15 minutes
- generate_prep_plan: Create personalized prep reminders
- analyze_healing_photo: AI assessment of healing progress
- check_availability: Check available dates/cities
- get_pricing_info: Get session rates and deposits
- create_booking: Create a new booking

RESPONSE STYLE:
- Keep messages concise but warm
- Use emojis sparingly (1-2 max per message)
- Break up long responses into digestible chunks
- Always end with a clear next step or question`;

// Tool definitions
const conciergeTools = [
  {
    type: "function",
    function: {
      name: "update_tattoo_brief",
      description: "Update the client's tattoo brief with new information. Call this whenever you learn something new about their tattoo idea. The Live Brief Card will update in real-time.",
      parameters: {
        type: "object",
        properties: {
          style: { type: "string", description: "Tattoo style (e.g., 'fine-line', 'botanical', 'illustrative', 'geometric')" },
          style_confidence: { type: "number", description: "Confidence in style match (0.0-1.0)" },
          subject: { type: "string", description: "What the tattoo depicts" },
          mood_keywords: { type: "array", items: { type: "string" }, description: "Emotional/aesthetic keywords" },
          placement: { type: "string", description: "Body location" },
          size_estimate_inches_min: { type: "number", description: "Minimum size in inches" },
          size_estimate_inches_max: { type: "number", description: "Maximum size in inches" },
          color_type: { type: "string", enum: ["black_grey", "color", "mixed", "undecided"] },
          session_estimate_hours_min: { type: "number" },
          session_estimate_hours_max: { type: "number" },
          constraints: { 
            type: "object",
            properties: {
              is_coverup: { type: "boolean" },
              has_scarring: { type: "boolean" },
              budget_min: { type: "number" },
              budget_max: { type: "number" },
              deadline: { type: "string" },
              first_tattoo: { type: "boolean" }
            }
          },
          missing_info: { type: "array", items: { type: "string" }, description: "What info is still needed" },
          status: { type: "string", enum: ["draft", "ready", "approved"] }
        },
        required: []
      }
    }
  },
  {
    type: "function",
    function: {
      name: "calculate_fit_score",
      description: "Calculate how well this project fits the artist's style and capabilities. Returns a score and recommendation.",
      parameters: {
        type: "object",
        properties: {
          style: { type: "string" },
          subject: { type: "string" },
          size: { type: "string" },
          complexity_notes: { type: "string" }
        },
        required: ["style"]
      }
    }
  },
  {
    type: "function",
    function: {
      name: "suggest_best_times",
      description: "Get the 3 best available time slots based on the tattoo brief and artist schedule.",
      parameters: {
        type: "object",
        properties: {
          session_hours: { type: "number", description: "Estimated session duration" },
          preferred_city: { type: "string" },
          preferred_dates: { type: "array", items: { type: "string" } },
          flexibility: { type: "string", enum: ["any", "weekends_only", "weekdays_only"] }
        },
        required: ["session_hours"]
      }
    }
  },
  {
    type: "function",
    function: {
      name: "hold_slot",
      description: "Reserve a time slot for 15 minutes while the client completes payment.",
      parameters: {
        type: "object",
        properties: {
          availability_id: { type: "string" },
          date: { type: "string" },
          city_id: { type: "string" }
        },
        required: ["availability_id", "date"]
      }
    }
  },
  {
    type: "function",
    function: {
      name: "generate_prep_plan",
      description: "Generate personalized preparation reminders based on the tattoo placement and session duration.",
      parameters: {
        type: "object",
        properties: {
          placement: { type: "string" },
          session_hours: { type: "number" },
          first_tattoo: { type: "boolean" },
          scheduled_date: { type: "string" }
        },
        required: ["placement", "session_hours", "scheduled_date"]
      }
    }
  },
  {
    type: "function",
    function: {
      name: "analyze_healing_photo",
      description: "Analyze an uploaded healing photo and provide assessment.",
      parameters: {
        type: "object",
        properties: {
          photo_url: { type: "string" },
          day_number: { type: "number" },
          client_notes: { type: "string" }
        },
        required: ["photo_url", "day_number"]
      }
    }
  },
  {
    type: "function",
    function: {
      name: "check_availability",
      description: "Check available dates for the given city and date range.",
      parameters: {
        type: "object",
        properties: {
          city: { type: "string" },
          start_date: { type: "string" },
          end_date: { type: "string" }
        },
        required: []
      }
    }
  },
  {
    type: "function",
    function: {
      name: "get_pricing_info",
      description: "Get current pricing, deposit, and session rate information.",
      parameters: {
        type: "object",
        properties: {
          city: { type: "string" }
        },
        required: []
      }
    }
  },
  {
    type: "function",
    function: {
      name: "create_booking",
      description: "Create a new booking with the collected information.",
      parameters: {
        type: "object",
        properties: {
          name: { type: "string" },
          email: { type: "string" },
          phone: { type: "string" },
          tattoo_description: { type: "string" },
          placement: { type: "string" },
          size: { type: "string" },
          preferred_date: { type: "string" },
          requested_city: { type: "string" }
        },
        required: ["name", "email", "tattoo_description"]
      }
    }
  },
  {
    type: "function",
    function: {
      name: "set_mode",
      description: "Transition to a different concierge mode.",
      parameters: {
        type: "object",
        properties: {
          mode: { type: "string", enum: ["explore", "qualify", "commit", "prepare", "aftercare", "rebook"] },
          reason: { type: "string" }
        },
        required: ["mode"]
      }
    }
  }
];

// Tool execution functions
// deno-lint-ignore no-explicit-any
async function executeTool(
  toolName: string, 
  args: Record<string, unknown>, 
  context: ConversationContext,
  supabase: any
): Promise<{ result: unknown; contextUpdates?: Partial<ConversationContext> }> {
  
  switch (toolName) {
    case "update_tattoo_brief": {
      // Upsert tattoo brief
      let briefId = context.tattoo_brief_id;
      
      if (briefId) {
        // Update existing brief
        const { error } = await supabase
          .from("tattoo_briefs")
          .update({
            ...args,
            updated_at: new Date().toISOString()
          })
          .eq("id", briefId);
        
        if (error) throw error;
      } else {
        // Create new brief
        const { data, error } = await supabase
          .from("tattoo_briefs")
          .insert({
            ...args,
            booking_id: context.booking_id || null,
            status: "draft"
          })
          .select()
          .single();
        
        if (error) throw error;
        briefId = data?.id;
      }
      
      // Fetch the updated brief
      const { data: brief } = await supabase
        .from("tattoo_briefs")
        .select("*")
        .eq("id", briefId)
        .single();
      
      return { 
        result: { success: true, brief, message: "Tattoo brief updated!" },
        contextUpdates: { tattoo_brief_id: briefId }
      };
    }
    
    case "calculate_fit_score": {
      const style = (args.style as string || "").toLowerCase();
      
      // Ferunda's specialties
      const strongStyles = ["fine-line", "botanical", "illustrative", "floral", "geometric"];
      const moderateStyles = ["minimalist", "linework", "ornamental"];
      const weakStyles = ["realism", "portrait", "traditional", "japanese", "tribal", "color realism"];
      
      let score = 70; // Default moderate
      let fitLevel = "good";
      let recommendation = "proceed";
      let reasoning = "";
      
      if (strongStyles.some(s => style.includes(s))) {
        score = 95;
        fitLevel = "excellent";
        reasoning = "This style is exactly in my wheelhouse. I'd love to work on this!";
      } else if (moderateStyles.some(s => style.includes(s))) {
        score = 80;
        fitLevel = "good";
        reasoning = "This is a good fit. A quick consult would help dial in the details.";
      } else if (weakStyles.some(s => style.includes(s))) {
        score = 40;
        fitLevel = "not_ideal";
        recommendation = "redirect";
        reasoning = "I want to be honest - this style isn't my specialty. I can recommend artists who focus on this, or we could explore a style that plays to my strengths.";
      }
      
      // Save to database
      if (context.tattoo_brief_id) {
        await supabase
          .from("client_fit_scores")
          .insert({
            tattoo_brief_id: context.tattoo_brief_id,
            booking_id: context.booking_id,
            score,
            fit_level: fitLevel,
            reasoning,
            recommendation,
            style_match_details: { analyzed_style: style, matched_to: strongStyles }
          });
      }
      
      return { result: { score, fitLevel, recommendation, reasoning } };
    }
    
    case "suggest_best_times": {
      const sessionHours = args.session_hours as number || 3;
      const preferredCity = args.preferred_city as string;
      
      // Fetch available slots
      const { data: availability } = await supabase
        .from("availability")
        .select("*, city_configurations(*)")
        .eq("is_available", true)
        .gte("date", new Date().toISOString().split("T")[0])
        .order("date", { ascending: true })
        .limit(20);
      
      if (!availability || availability.length === 0) {
        return { 
          result: { 
            slots: [], 
            message: "No available slots found. Would you like to join the waitlist?" 
          } 
        };
      }
      
      // Filter by city if specified
      // deno-lint-ignore no-explicit-any
      let filtered: any[] = availability || [];
      if (preferredCity) {
        // deno-lint-ignore no-explicit-any
        filtered = filtered.filter((a: any) => 
          a.city?.toLowerCase().includes(preferredCity.toLowerCase())
        );
      }
      
      // Score and rank slots
      // deno-lint-ignore no-explicit-any
      const scored = filtered.map((slot: any, index: number) => {
        let score = 100;
        
        // Prefer earlier dates slightly
        score -= index * 2;
        
        // Prefer weekends if flexible
        const date = new Date(slot.date);
        const isWeekend = date.getDay() === 0 || date.getDay() === 6;
        if (isWeekend) score += 10;
        
        return {
          ...slot,
          score,
          reason: index === 0 ? "Earliest available" : 
                  isWeekend ? "Weekend session" : 
                  "Good option"
        };
      });
      
      // Get top 3
      // deno-lint-ignore no-explicit-any
      const topSlots = scored
        .sort((a: any, b: any) => b.score - a.score)
        .slice(0, 3)
        .map((slot: any, i: number) => ({
          id: slot.id,
          date: slot.date,
          city: slot.city,
          cityId: slot.city_id,
          label: i === 0 ? "🟢 Best option" : i === 1 ? "⚡ Earliest" : "🌿 Alternative",
          reason: slot.reason,
          sessionRate: slot.city_configurations?.session_rate || 2500,
          depositAmount: slot.city_configurations?.deposit_amount || 500
        }));
      
      return { result: { slots: topSlots } };
    }
    
    case "hold_slot": {
      const availabilityId = args.availability_id as string;
      const date = args.date as string;
      const cityId = args.city_id as string;
      
      // Check for existing active holds
      const { data: existingHold } = await supabase
        .from("slot_holds")
        .select("*")
        .eq("availability_id", availabilityId)
        .eq("status", "active")
        .gt("expires_at", new Date().toISOString())
        .single();
      
      if (existingHold) {
        return { 
          result: { 
            success: false, 
            message: "This slot is currently being held by another client. Try another option?" 
          } 
        };
      }
      
      // Create hold
      const { data: hold, error } = await supabase
        .from("slot_holds")
        .insert({
          availability_id: availabilityId,
          booking_id: context.booking_id,
          held_date: date,
          city_id: cityId,
          status: "active"
        })
        .select()
        .single();
      
      if (error) throw error;
      
      return { 
        result: { 
          success: true, 
          holdId: hold.id,
          expiresAt: hold.expires_at,
          message: "Slot held for 15 minutes! Complete your deposit to confirm." 
        } 
      };
    }
    
    case "generate_prep_plan": {
      const placement = args.placement as string;
      const sessionHours = args.session_hours as number;
      const firstTattoo = args.first_tattoo as boolean;
      const scheduledDate = args.scheduled_date as string;
      
      const sessionDate = new Date(scheduledDate);
      
      // Generate personalized reminders
      const reminders = [
        {
          reminder_type: "7_days",
          scheduled_for: new Date(sessionDate.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString(),
          title: "One week to go!",
          content: `Your ${placement} session is coming up! Start moisturizing the area daily. ${sessionHours >= 4 ? "For a longer session like yours, staying hydrated all week helps." : ""}`,
          placement_specific: true
        },
        {
          reminder_type: "48_hours",
          scheduled_for: new Date(sessionDate.getTime() - 2 * 24 * 60 * 60 * 1000).toISOString(),
          title: "48 hours out",
          content: `Almost time! Avoid alcohol and get good sleep the next two nights. ${placement.toLowerCase().includes("arm") ? "Wear a loose, short-sleeved shirt you don't mind getting ink on." : "Wear comfortable, loose clothing."}`,
          placement_specific: true
        },
        {
          reminder_type: "24_hours",
          scheduled_for: new Date(sessionDate.getTime() - 24 * 60 * 60 * 1000).toISOString(),
          title: "Tomorrow's the day!",
          content: `Please confirm you're all set for tomorrow! Eat a good meal before you come. Bring: ID, snacks, water, headphones. ${firstTattoo ? "First tattoo jitters are normal - you've got this! 💪" : ""}`,
          placement_specific: false
        },
        {
          reminder_type: "morning_of",
          scheduled_for: new Date(sessionDate.getTime() - 2 * 60 * 60 * 1000).toISOString(),
          title: "See you soon!",
          content: "Eat before you arrive, stay hydrated, and come ready to create something beautiful together! ✨",
          placement_specific: false
        }
      ];
      
      // Save reminders if we have a booking
      if (context.booking_id) {
        for (const reminder of reminders) {
          await supabase
            .from("prep_reminders")
            .insert({
              booking_id: context.booking_id,
              ...reminder
            });
        }
      }
      
      return { result: { reminders, message: "Prep plan created! You'll receive reminders at the right times." } };
    }
    
    case "check_availability": {
      const city = args.city as string;
      const startDate = args.start_date as string || new Date().toISOString().split("T")[0];
      
      let query = supabase
        .from("availability")
        .select("*, city_configurations(*)")
        .eq("is_available", true)
        .gte("date", startDate)
        .order("date", { ascending: true })
        .limit(10);
      
      if (city) {
        query = query.ilike("city", `%${city}%`);
      }
      
      const { data: slots } = await query;
      
      // deno-lint-ignore no-explicit-any
      const cities = [...new Set(slots?.map((s: any) => s.city) || [])];
      
      return { 
        result: { 
          available: slots?.length || 0,
          cities,
          nextAvailable: slots?.[0]?.date,
          // deno-lint-ignore no-explicit-any
          slots: slots?.slice(0, 5).map((s: any) => ({
            date: s.date,
            city: s.city,
            id: s.id
          }))
        } 
      };
    }
    
    case "get_pricing_info": {
      const city = args.city as string;
      
      let query = supabase
        .from("city_configurations")
        .select("*")
        .eq("is_active", true);
      
      if (city) {
        query = query.ilike("city_name", `%${city}%`);
      }
      
      const { data: cities } = await query;
      
      const defaultRate = 2500;
      const defaultDeposit = 500;
      
      if (!cities || cities.length === 0) {
        return { 
          result: { 
            sessionRate: defaultRate,
            depositAmount: defaultDeposit,
            message: `Sessions start at $${defaultRate}/day with a $${defaultDeposit} deposit to secure your spot.`
          } 
        };
      }
      
      const cityInfo = cities[0];
      
      return { 
        result: { 
          sessionRate: cityInfo.session_rate || defaultRate,
          depositAmount: cityInfo.deposit_amount || defaultDeposit,
          city: cityInfo.city_name,
          studioName: cityInfo.studio_name,
          message: `Sessions in ${cityInfo.city_name} are $${cityInfo.session_rate || defaultRate}/day with a $${cityInfo.deposit_amount || defaultDeposit} deposit.`
        } 
      };
    }
    
    case "create_booking": {
      const { data: booking, error } = await supabase
        .from("bookings")
        .insert({
          name: args.name as string,
          email: args.email as string,
          phone: args.phone as string || null,
          tattoo_description: args.tattoo_description as string,
          placement: args.placement as string || null,
          size: args.size as string || null,
          preferred_date: args.preferred_date as string || null,
          requested_city: args.requested_city as string || null,
          source: "studio_concierge",
          pipeline_stage: "new_inquiry",
          tattoo_brief_id: context.tattoo_brief_id || null,
          concierge_mode: "qualify"
        })
        .select()
        .single();
      
      if (error) throw error;
      
      // Link brief to booking if exists
      if (context.tattoo_brief_id) {
        await supabase
          .from("tattoo_briefs")
          .update({ booking_id: booking.id })
          .eq("id", context.tattoo_brief_id);
      }
      
      return { 
        result: { success: true, bookingId: booking.id },
        contextUpdates: { booking_id: booking.id }
      };
    }
    
    case "set_mode": {
      const newMode = args.mode as ConciergeMode;
      
      return { 
        result: { success: true, newMode, message: `Transitioning to ${newMode} mode.` },
        contextUpdates: { mode: newMode }
      };
    }
    
    default:
      return { result: { error: `Unknown tool: ${toolName}` } };
  }
}

// Build context-aware system prompt
function buildSystemPrompt(context: ConversationContext): string {
  const modePrompt = MODE_PROMPTS[context.mode];
  
  let contextInfo = "";
  if (context.client_name) {
    contextInfo += `\n\nClient name: ${context.client_name}`;
  }
  if (context.tattoo_brief_id) {
    contextInfo += `\nActive tattoo brief: Yes (ID: ${context.tattoo_brief_id})`;
  }
  if (context.booking_id) {
    contextInfo += `\nBooking created: Yes (ID: ${context.booking_id})`;
  }
  
  return `${CONCIERGE_SYSTEM_PROMPT}\n\n--- CURRENT MODE: ${context.mode.toUpperCase()} ---\n${modePrompt}${contextInfo}`;
}

// Main handler
Deno.serve(async (req) => {
  // CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }
  
  // Health check
  if (req.method === "GET") {
    return new Response(JSON.stringify({
      ok: true,
      version: "1.0.0-concierge",
      time: new Date().toISOString(),
      modes: Object.keys(MODE_PROMPTS)
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" }
    });
  }
  
  try {
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    
    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY not configured");
    }
    
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
    
    const body = await req.json();
    const { messages, context: inputContext, conversationId } = body;
    
    // Initialize or restore context
    let context: ConversationContext = inputContext || {
      mode: "explore",
      tattoo_brief_id: undefined,
      booking_id: undefined,
      client_name: undefined,
      client_email: undefined
    };
    
    // If we have a conversation ID, try to restore context
    if (conversationId) {
      const { data: conv } = await supabase
        .from("chat_conversations")
        .select("*")
        .eq("id", conversationId)
        .single();
      
      if (conv) {
        context = {
          mode: (conv.concierge_mode as ConciergeMode) || "explore",
          tattoo_brief_id: conv.tattoo_brief_id,
          booking_id: undefined, // TODO: link conversations to bookings
          client_name: conv.client_name,
          client_email: conv.client_email
        };
      }
    }
    
    // Build the system prompt
    const systemPrompt = buildSystemPrompt(context);
    
    console.log(`[Concierge] Mode: ${context.mode}, Messages: ${messages.length}`);
    
    // Call AI with tools
    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        model: "openai/gpt-5-mini",
        messages: [
          { role: "system", content: systemPrompt },
          ...messages
        ],
        tools: conciergeTools,
        tool_choice: "auto",
        max_completion_tokens: 1000
      })
    });
    
    if (!response.ok) {
      const errorText = await response.text();
      console.error("[Concierge] AI Error:", errorText);
      throw new Error(`AI request failed: ${response.status}`);
    }
    
    const aiData = await response.json();
    const choice = aiData.choices?.[0];
    
    if (!choice) {
      throw new Error("No response from AI");
    }
    
    // Check for tool calls
    const toolCalls = choice.message?.tool_calls;
    
    if (toolCalls && toolCalls.length > 0) {
      // Execute all tool calls
      const toolResults = [];
      
      for (const toolCall of toolCalls) {
        const toolName = toolCall.function.name;
        const toolArgs = JSON.parse(toolCall.function.arguments || "{}");
        
        console.log(`[Concierge] Executing tool: ${toolName}`);
        
        try {
          const { result, contextUpdates } = await executeTool(toolName, toolArgs, context, supabase);
          
          // Apply context updates
          if (contextUpdates) {
            context = { ...context, ...contextUpdates };
          }
          
          toolResults.push({
            tool_call_id: toolCall.id,
            role: "tool",
            content: JSON.stringify(result)
          });
        } catch (toolError: unknown) {
          const errMsg = toolError instanceof Error ? toolError.message : "Unknown error";
          console.error(`[Concierge] Tool error (${toolName}):`, toolError);
          toolResults.push({
            tool_call_id: toolCall.id,
            role: "tool",
            content: JSON.stringify({ error: errMsg })
          });
        }
      }
      
      // Follow-up call with tool results
      const followUpResponse = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${LOVABLE_API_KEY}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          model: "openai/gpt-5-mini",
          messages: [
            { role: "system", content: systemPrompt },
            ...messages,
            choice.message,
            ...toolResults
          ],
          max_completion_tokens: 1000,
          stream: true
        })
      });

      if (!followUpResponse.ok) {
        throw new Error(`Follow-up request failed: ${followUpResponse.status}`);
      }
      
      // Update conversation context in database
      if (conversationId) {
        await supabase
          .from("chat_conversations")
          .update({
            concierge_mode: context.mode,
            tattoo_brief_id: context.tattoo_brief_id,
            client_name: context.client_name,
            client_email: context.client_email
          })
          .eq("id", conversationId);
      }
      
      // Stream the response with context header
      const headers = new Headers(corsHeaders);
      headers.set("Content-Type", "text/event-stream");
      headers.set("X-Concierge-Context", JSON.stringify(context));
      
      return new Response(followUpResponse.body, { headers });
    }
    
    // No tool calls - stream direct response
    const streamResponse = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        model: "openai/gpt-5-mini",
        messages: [
          { role: "system", content: systemPrompt },
          ...messages
        ],
        max_completion_tokens: 1000,
        stream: true
      })
    });

    const headers = new Headers(corsHeaders);
    headers.set("Content-Type", "text/event-stream");
    headers.set("X-Concierge-Context", JSON.stringify(context));
    
    return new Response(streamResponse.body, { headers });
    
  } catch (error: unknown) {
    console.error("[Concierge] Error:", error);
    const errMsg = error instanceof Error ? error.message : "Internal server error";
    return new Response(JSON.stringify({
      error: errMsg
    }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" }
    });
  }
});
