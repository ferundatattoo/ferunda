import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const supabase = createClient(supabaseUrl, supabaseServiceKey);

  try {
    const { booking_id } = await req.json();

    if (!booking_id) {
      return new Response(
        JSON.stringify({ error: "booking_id is required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Get booking info
    const { data: booking, error: bookingError } = await supabase
      .from("bookings")
      .select("id, name, email, tattoo_description, scheduled_date")
      .eq("id", booking_id)
      .single();

    if (bookingError || !booking) {
      return new Response(
        JSON.stringify({ error: "Booking not found" }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Check if certificate already exists
    const { data: existingCert } = await supabase
      .from("healing_certificates")
      .select("*")
      .eq("booking_id", booking_id)
      .single();

    if (existingCert) {
      return new Response(
        JSON.stringify({ certificate: existingCert }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Get all healing entries for this booking
    const { data: entries, error: entriesError } = await supabase
      .from("healing_progress")
      .select("*")
      .eq("booking_id", booking_id)
      .order("created_at", { ascending: true });

    if (entriesError) {
      return new Response(
        JSON.stringify({ error: "Failed to fetch healing entries" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (!entries || entries.length === 0) {
      return new Response(
        JSON.stringify({ error: "No healing entries found" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Calculate statistics
    const scoresOnly = entries.filter(e => e.ai_health_score !== null);
    const averageScore = scoresOnly.length > 0
      ? scoresOnly.reduce((acc, e) => acc + (e.ai_health_score || 0), 0) / scoresOnly.length
      : 0;

    const firstEntry = entries[0];
    const lastEntry = entries[entries.length - 1];
    const healingDurationDays = Math.ceil(
      (new Date(lastEntry.created_at).getTime() - new Date(firstEntry.created_at).getTime()) / (1000 * 60 * 60 * 24)
    );

    // Check eligibility
    if (healingDurationDays < 30 || averageScore < 80) {
      return new Response(
        JSON.stringify({ 
          error: "Certificate requirements not met",
          requirements: {
            days_needed: 30,
            days_current: healingDurationDays,
            score_needed: 80,
            score_current: averageScore
          }
        }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Generate certificate data
    const certificateData = {
      client_name: booking.name,
      tattoo_description: booking.tattoo_description,
      session_date: booking.scheduled_date,
      healing_started: firstEntry.created_at,
      healing_completed: lastEntry.created_at,
      total_checkups: entries.length,
      photos: entries.filter(e => e.photo_url).map(e => ({
        day: e.day_number,
        photo_url: e.photo_url,
        score: e.ai_health_score
      })),
      healing_journey: entries.map(e => ({
        day: e.day_number,
        stage: e.ai_healing_stage,
        score: e.ai_health_score,
        date: e.created_at
      })),
      final_assessment: averageScore >= 95 ? "Excellent healing" : averageScore >= 85 ? "Very good healing" : "Good healing"
    };

    // Create certificate
    const { data: certificate, error: certError } = await supabase
      .from("healing_certificates")
      .insert({
        booking_id,
        final_health_score: Math.round(averageScore),
        total_photos: entries.filter(e => e.photo_url).length,
        healing_duration_days: healingDurationDays,
        certificate_data: certificateData
      })
      .select()
      .single();

    if (certError) {
      console.error("Certificate creation error:", certError);
      return new Response(
        JSON.stringify({ error: "Failed to create certificate" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Log the event
    await supabase.from("booking_activities").insert({
      booking_id,
      activity_type: "healing_certificate_generated",
      description: `Healing certificate generated with score ${Math.round(averageScore)}%`,
      metadata: { certificate_id: certificate.id }
    });

    console.log(`Certificate generated for booking ${booking_id}: ${certificate.certificate_number}`);

    return new Response(
      JSON.stringify({ certificate }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error) {
    console.error("Generate certificate error:", error);
    return new Response(
      JSON.stringify({ error: "Internal server error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
