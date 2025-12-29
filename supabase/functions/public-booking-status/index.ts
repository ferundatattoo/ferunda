import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

type PublicBookingStatusRequest = {
  trackingCode?: string;
};

function json(status: number, body: unknown) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

function normalizeTrackingCode(input: string) {
  return input.trim().toUpperCase();
}

function isValidTrackingCode(code: string) {
  return /^[A-Z0-9]{8}$/.test(code);
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  if (req.method !== "POST") {
    return json(405, { error: "Method not allowed" });
  }

  try {
    const body = (await req.json().catch(() => ({}))) as PublicBookingStatusRequest;
    const trackingCode = normalizeTrackingCode(body.trackingCode || "");

    if (!trackingCode) return json(400, { error: "Missing trackingCode" });
    if (!isValidTrackingCode(trackingCode)) return json(400, { error: "Invalid trackingCode" });

    const url = Deno.env.get("SUPABASE_URL")?.trim();
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")?.trim();

    if (!url) return json(500, { error: "Server not configured: missing SUPABASE_URL" });
    if (!serviceRoleKey) return json(500, { error: "Server not configured: missing SUPABASE_SERVICE_ROLE_KEY" });

    const supabase = createClient(url, serviceRoleKey, {
      auth: { persistSession: false },
    });

    const { data, error } = await supabase
      .from("bookings")
      .select(
        "tracking_code,status,pipeline_stage,created_at,updated_at,scheduled_date,scheduled_time,deposit_paid,deposit_amount,session_rate"
      )
      .eq("tracking_code", trackingCode)
      .maybeSingle();

    if (error) {
      console.error("public-booking-status db error", error);
      return json(500, { error: "Database error" });
    }

    if (!data) {
      return json(404, { error: "Not found" });
    }

    return json(200, { booking: data });
  } catch (e) {
    console.error("public-booking-status error", e);
    return json(500, { error: "Unexpected server error" });
  }
});
