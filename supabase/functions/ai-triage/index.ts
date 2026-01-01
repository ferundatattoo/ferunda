import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";

/**
 * AI TRIAGE v2.0 - Intelligent Message Priority Engine
 * 
 * Features:
 * - Multi-signal priority scoring
 * - Revenue potential estimation
 * - Auto-response generation
 * - Smart routing to artist vs assistant
 * - Historical pattern learning
 */

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const LOVABLE_API_URL = "https://api.lovable.dev/v1/chat/completions";

interface TriageResult {
  priority: "urgent" | "high" | "normal" | "low";
  priority_score: number; // 0-100
  intent: string;
  sentiment: "positive" | "neutral" | "negative" | "frustrated" | "excited";
  suggestedResponse: string;
  actionRequired: string | null;
  routeTo: "artist" | "assistant" | "auto_reply" | "ignore";
  bookingMatch: string | null;
  revenue_potential: number;
  confidence: number;
  reasoning: string;
  tags: string[];
}

// Priority scoring weights
const PRIORITY_SIGNALS = {
  // High priority signals
  has_upcoming_appointment: 30,
  mentions_payment: 25,
  mentions_deposit: 25,
  returning_client: 20,
  mentions_health_concern: 40,
  complaint_detected: 35,
  urgent_keywords: 30,
  
  // Medium priority signals
  ready_to_book: 15,
  pricing_inquiry: 10,
  availability_question: 10,
  has_reference_image: 8,
  
  // Low priority signals
  general_question: 5,
  first_inquiry: 5,
  
  // Negative signals
  spam_detected: -50,
  bot_detected: -40,
  promotional: -20,
};

// Intent patterns for detection
const INTENT_PATTERNS: Record<string, RegExp[]> = {
  booking_ready: [
    /want to book|ready to book|schedule (a |my )?appointment/i,
    /book (a |an )?session|lock in|confirm (my |the )?date/i,
    /pay (the )?deposit|send (me )?deposit link/i,
  ],
  reschedule: [
    /reschedule|change (my )?date|move (my )?appointment/i,
    /can('t| not) make it|something came up/i,
  ],
  cancel: [
    /cancel (my )?appointment|need to cancel/i,
    /don't want to proceed|changed my mind/i,
  ],
  pricing: [
    /how much|what('s| is) the (price|cost)/i,
    /price range|estimate|quote/i,
    /hourly rate|deposit amount/i,
  ],
  availability: [
    /when (are you |is your )?available/i,
    /next (available |open )?slot|openings/i,
    /do you have time|free dates/i,
  ],
  aftercare: [
    /healing|aftercare|how (to |should I )?take care/i,
    /is this normal|worried about|infection/i,
    /scabbing|peeling|redness|swelling/i,
  ],
  complaint: [
    /not happy|disappointed|issue with/i,
    /refund|terrible|awful|worst/i,
    /fix this|make it right/i,
  ],
  compliment: [
    /amazing|love (it|my tattoo)|perfect/i,
    /so happy|thank you so much|incredible/i,
    /recommend|best artist/i,
  ],
};

async function analyzeMessage(
  content: string,
  senderEmail: string | null,
  clientHistory: unknown[]
): Promise<TriageResult> {
  const systemPrompt = `You are an AI triage specialist for a high-end tattoo studio.
Analyze incoming messages to determine priority, intent, and best response strategy.

STUDIO INFO:
- Artist: Ferunda - specializes in micro-realism geometric, black/grey only
- Price range: $200-500/hour
- Deposit: 30% required to book
- Location: Austin TX (primary), guest spots in LA, Houston, NYC

TRIAGE RULES:
1. URGENT: Health concerns, appointments within 48h, payment issues, complaints
2. HIGH: Ready to book, deposit ready, returning clients with new project
3. NORMAL: General inquiries, pricing questions, new potential clients
4. LOW: "Just looking", unrelated, spam

ROUTING:
- artist: Complex custom work, complaints, VIP clients
- assistant: Pricing, scheduling, basic questions
- auto_reply: Simple FAQs, confirmations
- ignore: Spam, bots, promotional

Respond ONLY with valid JSON matching this schema:
{
  "priority": "urgent|high|normal|low",
  "priority_score": 0-100,
  "intent": "booking_ready|reschedule|cancel|pricing|availability|aftercare|complaint|compliment|general|spam",
  "sentiment": "positive|neutral|negative|frustrated|excited",
  "suggestedResponse": "Brief 1-3 sentence response draft",
  "actionRequired": null|"respond_asap"|"schedule_call"|"send_deposit"|"update_booking"|"escalate"|"follow_up_3_days",
  "routeTo": "artist|assistant|auto_reply|ignore",
  "bookingMatch": null|"existing_client"|"new_inquiry"|"returning_client",
  "revenue_potential": 0-5000 (estimated value in USD),
  "confidence": 0.0-1.0,
  "reasoning": "Brief explanation of triage decision",
  "tags": ["tag1", "tag2"]
}`;

  const userPrompt = `ANALYZE THIS MESSAGE:

From: ${senderEmail || "Unknown sender"}
Client History: ${clientHistory.length > 0 ? JSON.stringify(clientHistory.slice(0, 3)) : "No prior history"}

MESSAGE:
${content}

Provide triage assessment.`;

  try {
    const response = await fetch(LOVABLE_API_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt }
        ],
        temperature: 0.2,
        max_tokens: 800
      })
    });

    if (!response.ok) {
      throw new Error(`AI API failed: ${response.status}`);
    }

    const data = await response.json();
    const aiContent = data.choices?.[0]?.message?.content || "";
    
    // Parse JSON from response
    const jsonMatch = aiContent.match(/\{[\s\S]*\}/);
    if (!jsonMatch) throw new Error("No JSON in response");
    
    return JSON.parse(jsonMatch[0]);
  } catch (error) {
    console.error("[AI-TRIAGE] Analysis failed:", error);
    
    // Fallback to rule-based triage
    return ruleBasedTriage(content, senderEmail, clientHistory);
  }
}

function ruleBasedTriage(
  content: string,
  senderEmail: string | null,
  clientHistory: unknown[]
): TriageResult {
  let priorityScore = 50;
  let intent = "general";
  let sentiment: TriageResult["sentiment"] = "neutral";
  const tags: string[] = [];

  const lowerContent = content.toLowerCase();

  // Detect intent
  for (const [intentName, patterns] of Object.entries(INTENT_PATTERNS)) {
    if (patterns.some(p => p.test(content))) {
      intent = intentName;
      tags.push(intentName);
      break;
    }
  }

  // Calculate priority score
  if (/urgent|asap|emergency|help/i.test(content)) {
    priorityScore += PRIORITY_SIGNALS.urgent_keywords;
    tags.push("urgent");
  }
  if (/deposit|payment|pay/i.test(content)) {
    priorityScore += PRIORITY_SIGNALS.mentions_deposit;
    tags.push("deposit_mention");
  }
  if (clientHistory.length > 0) {
    priorityScore += PRIORITY_SIGNALS.returning_client;
    tags.push("returning_client");
  }
  if (/infection|swelling|bleeding|worried/i.test(content)) {
    priorityScore += PRIORITY_SIGNALS.mentions_health_concern;
    tags.push("health_concern");
  }
  if (/disappointed|refund|terrible|worst/i.test(content)) {
    priorityScore += PRIORITY_SIGNALS.complaint_detected;
    sentiment = "frustrated";
    tags.push("complaint");
  }
  if (/spam|unsubscribe|click here|limited offer/i.test(content)) {
    priorityScore += PRIORITY_SIGNALS.spam_detected;
    intent = "spam";
    tags.push("spam");
  }

  // Determine priority level
  let priority: TriageResult["priority"] = "normal";
  if (priorityScore >= 80) priority = "urgent";
  else if (priorityScore >= 60) priority = "high";
  else if (priorityScore < 30) priority = "low";

  // Determine routing
  let routeTo: TriageResult["routeTo"] = "assistant";
  if (priority === "urgent" || sentiment === "frustrated") routeTo = "artist";
  if (intent === "spam") routeTo = "ignore";
  if (intent === "compliment" || intent === "aftercare") routeTo = "auto_reply";

  // Estimate revenue potential
  let revenuePotential = 0;
  if (intent === "booking_ready") revenuePotential = 1500;
  else if (intent === "pricing" || intent === "availability") revenuePotential = 800;
  else if (clientHistory.length > 0) revenuePotential = 2000;

  return {
    priority,
    priority_score: Math.min(100, Math.max(0, priorityScore)),
    intent,
    sentiment,
    suggestedResponse: generateAutoResponse(intent, sentiment),
    actionRequired: priority === "urgent" ? "respond_asap" : null,
    routeTo,
    bookingMatch: clientHistory.length > 0 ? "returning_client" : "new_inquiry",
    revenue_potential: revenuePotential,
    confidence: 0.7,
    reasoning: `Rule-based triage: intent=${intent}, score=${priorityScore}`,
    tags
  };
}

function generateAutoResponse(intent: string, sentiment: string): string {
  const responses: Record<string, string> = {
    booking_ready: "Thank you for your interest! I'd love to help you book a session. Could you share your design idea and preferred dates?",
    pricing: "My rates are $200-500/hour depending on complexity. A 30% deposit secures your appointment. Would you like to discuss your specific project?",
    availability: "I'm currently booking 2-3 weeks out in Austin. Do you have specific dates in mind?",
    aftercare: "Thanks for checking in about your healing! If you're concerned, please send a photo and I'll take a look right away.",
    compliment: "Thank you so much for the kind words! It means the world to me. Can't wait to create more art together!",
    complaint: "I'm sorry to hear you're having an issue. Let me look into this personally and get back to you today.",
    general: "Thanks for reaching out! How can I help you with your tattoo journey?",
    spam: "",
  };

  return responses[intent] || responses.general;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    const { messageId, content, channel, senderEmail, senderName, autoReply } = await req.json();

    if (!content) {
      return new Response(
        JSON.stringify({ error: "Message content required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log(`[AI-TRIAGE v2.0] Processing message from ${senderEmail || "unknown"}`);

    // Fetch client history
    let clientHistory: unknown[] = [];
    if (senderEmail) {
      const { data: bookings } = await supabase
        .from("bookings")
        .select("id, name, status, pipeline_stage, scheduled_date, tattoo_description, total_price")
        .eq("email", senderEmail)
        .order("created_at", { ascending: false })
        .limit(5);

      if (bookings) clientHistory = bookings;
    }

    // Analyze message
    const triageResult = await analyzeMessage(content, senderEmail, clientHistory);

    // Update message record if messageId provided
    if (messageId) {
      await supabase
        .from("omnichannel_messages")
        .update({
          ai_intent_detected: triageResult.intent,
          ai_sentiment: triageResult.sentiment,
          ai_processed: true,
          ai_response_generated: !!triageResult.suggestedResponse,
          ai_priority_score: triageResult.priority_score,
          ai_route_to: triageResult.routeTo,
          escalated_to_human: triageResult.routeTo === "artist",
          escalation_reason: triageResult.routeTo === "artist" ? triageResult.reasoning : null,
          metadata: {
            triage_v2: true,
            revenue_potential: triageResult.revenue_potential,
            tags: triageResult.tags,
            confidence: triageResult.confidence
          }
        })
        .eq("id", messageId);
    }

    // Log triage decision for learning
    await supabase.from("agent_learning_data").insert({
      interaction_type: "message_triage",
      input_data: { content, senderEmail, channel, clientHistory: clientHistory.length },
      output_data: triageResult,
      outcome: null // Will be updated when artist/assistant responds
    });

    console.log(`[AI-TRIAGE v2.0] Result: priority=${triageResult.priority} (${triageResult.priority_score}), route=${triageResult.routeTo}, revenue=$${triageResult.revenue_potential}`);

    return new Response(
      JSON.stringify({
        success: true,
        triage: triageResult,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error) {
    console.error("[AI-TRIAGE] Error:", error);
    return new Response(
      JSON.stringify({ 
        error: error instanceof Error ? error.message : "Triage failed",
        triage: {
          priority: "normal",
          priority_score: 50,
          intent: "general",
          sentiment: "neutral",
          suggestedResponse: "Thank you for your message. I'll respond shortly!",
          actionRequired: null,
          routeTo: "assistant",
          bookingMatch: null,
          revenue_potential: 0,
          confidence: 0,
          reasoning: "Fallback triage due to error",
          tags: []
        }
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
