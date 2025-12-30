import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const OPENROUTER_API_KEY = Deno.env.get("OPENROUTER_API_KEY");

interface TriageResult {
  priority: "urgent" | "high" | "normal" | "low";
  intent: string;
  sentiment: "positive" | "neutral" | "negative" | "frustrated";
  suggestedResponse: string;
  actionRequired: string | null;
  bookingMatch: string | null;
  confidence: number;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL") ?? "",
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
  );

  try {
    const { messageId, content, channel, senderEmail, senderName } = await req.json();

    if (!content) {
      return new Response(
        JSON.stringify({ error: "Message content required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Fetch context: recent bookings, client history
    let clientContext = "";
    if (senderEmail) {
      const { data: bookings } = await supabase
        .from("bookings")
        .select("id, name, email, status, pipeline_stage, scheduled_date, tattoo_description")
        .eq("email", senderEmail)
        .order("created_at", { ascending: false })
        .limit(3);

      if (bookings && bookings.length > 0) {
        clientContext = `\n\nCLIENT HISTORY:\n${bookings.map(b => 
          `- ${b.name}: ${b.pipeline_stage}, scheduled: ${b.scheduled_date || 'TBD'}, "${b.tattoo_description?.substring(0, 100)}..."`
        ).join("\n")}`;
      }
    }

    // Use AI to analyze the message
    const analysisPrompt = `You are an AI assistant for a tattoo studio. Analyze this incoming message and provide a triage assessment.

MESSAGE CHANNEL: ${channel || "email"}
SENDER: ${senderName || "Unknown"} ${senderEmail ? `<${senderEmail}>` : ""}
MESSAGE CONTENT:
${content}
${clientContext}

Analyze and respond in JSON format with these fields:
{
  "priority": "urgent" | "high" | "normal" | "low",
  "intent": "booking_inquiry" | "deposit_question" | "reschedule" | "cancel" | "aftercare" | "pricing" | "availability" | "complaint" | "compliment" | "general" | "spam",
  "sentiment": "positive" | "neutral" | "negative" | "frustrated",
  "suggestedResponse": "A brief, professional draft response (1-3 sentences max)",
  "actionRequired": null | "respond_asap" | "schedule_consultation" | "send_deposit_link" | "update_booking" | "escalate_to_artist",
  "bookingMatch": null | "likely_existing_client" | "new_inquiry",
  "confidence": 0.0-1.0
}

Priority guidelines:
- URGENT: Appointment within 48h, complaint, payment issue, health concern
- HIGH: Deposit ready, booking ready to confirm, returning client
- NORMAL: General inquiries, pricing questions
- LOW: Spam, unrelated, "just looking"

RESPOND ONLY WITH VALID JSON.`;

    const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${OPENROUTER_API_KEY}`,
        "HTTP-Referer": Deno.env.get("SITE_URL") || "https://ferunda.com",
        "X-Title": "Ferunda Studio AI Triage",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [{ role: "user", content: analysisPrompt }],
        max_tokens: 500,
        temperature: 0.3,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("[AI-TRIAGE] API error:", errorText);
      throw new Error(`AI API failed: ${response.status}`);
    }

    const aiData = await response.json();
    const aiContent = aiData.choices?.[0]?.message?.content || "";
    
    // Parse the JSON response
    let triageResult: TriageResult;
    try {
      // Extract JSON from potential markdown code blocks
      const jsonMatch = aiContent.match(/\{[\s\S]*\}/);
      if (!jsonMatch) throw new Error("No JSON found");
      triageResult = JSON.parse(jsonMatch[0]);
    } catch (parseErr) {
      console.error("[AI-TRIAGE] Parse error:", parseErr, "Raw:", aiContent);
      // Return a default triage if parsing fails
      triageResult = {
        priority: "normal",
        intent: "general",
        sentiment: "neutral",
        suggestedResponse: "Thank you for reaching out! I'll get back to you soon.",
        actionRequired: null,
        bookingMatch: null,
        confidence: 0.5,
      };
    }

    // Store triage result if messageId provided
    if (messageId) {
      // Update omnichannel_messages if it exists
      await supabase
        .from("omnichannel_messages")
        .update({
          ai_intent_detected: triageResult.intent,
          ai_sentiment: triageResult.sentiment,
          ai_processed: true,
          ai_response_generated: true,
          escalated_to_human: triageResult.priority === "urgent",
          escalation_reason: triageResult.priority === "urgent" ? triageResult.actionRequired : null,
        })
        .eq("id", messageId);
    }

    console.log(`[AI-TRIAGE] Analyzed message: priority=${triageResult.priority}, intent=${triageResult.intent}`);

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
          intent: "general",
          sentiment: "neutral",
          suggestedResponse: "Thank you for your message. I'll respond shortly!",
          actionRequired: null,
          bookingMatch: null,
          confidence: 0,
        }
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
