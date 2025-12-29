import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const ALLOWED_ORIGINS = [
  'https://ferunda.com',
  'https://www.ferunda.com',
  'http://localhost:5173',
  'http://localhost:8080'
];

function getCorsHeaders(req: Request) {
  const origin = req.headers.get('origin') || '';
  const isLovablePreview = origin.endsWith('.lovableproject.com') || origin.endsWith('.lovable.app');
  const allowedOrigin = ALLOWED_ORIGINS.includes(origin) || isLovablePreview ? origin : ALLOWED_ORIGINS[0];
  
  return {
    "Access-Control-Allow-Origin": allowedOrigin,
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-fingerprint-hash",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Max-Age": "86400",
  };
}

// Simple hash function matching send-verification-otp
async function hashOTP(otp: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(otp + Deno.env.get("CHAT_SESSION_SECRET"));
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

interface VerifyRequest {
  email: string;
  otp: string;
}

const handler = async (req: Request): Promise<Response> => {
  const corsHeaders = getCorsHeaders(req);

  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const { email, otp }: VerifyRequest = await req.json();
    
    // Validate inputs
    if (!email || !otp || otp.length !== 6) {
      return new Response(
        JSON.stringify({ error: "Invalid verification code" }),
        { status: 400, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    const normalizedEmail = email.trim().toLowerCase();
    const otpHash = await hashOTP(otp);

    // Find valid OTP
    const { data: otpRecord, error: fetchError } = await supabaseAdmin
      .from('verification_otps')
      .select('*')
      .eq('email', normalizedEmail)
      .eq('otp_hash', otpHash)
      .is('verified_at', null)
      .gte('expires_at', new Date().toISOString())
      .order('created_at', { ascending: false })
      .limit(1)
      .single();

    if (fetchError || !otpRecord) {
      // Increment attempt count for the most recent unverified OTP
      const { data: latestOtp } = await supabaseAdmin
        .from('verification_otps')
        .select('id, attempt_count')
        .eq('email', normalizedEmail)
        .is('verified_at', null)
        .order('created_at', { ascending: false })
        .limit(1)
        .single();
      
      if (latestOtp) {
        await supabaseAdmin
          .from('verification_otps')
          .update({ attempt_count: (latestOtp.attempt_count || 0) + 1 })
          .eq('id', latestOtp.id);
      }

      console.log(`Invalid OTP attempt for: ${normalizedEmail}`);
      return new Response(
        JSON.stringify({ error: "Invalid or expired verification code" }),
        { status: 400, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    // Check attempt count
    if (otpRecord.attempt_count >= 5) {
      return new Response(
        JSON.stringify({ error: "Too many failed attempts. Please request a new code." }),
        { status: 429, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    // Generate a verification token for the booking
    const verificationToken = crypto.randomUUID();
    
    // Hash the token for secure storage
    const tokenEncoder = new TextEncoder();
    const tokenData = tokenEncoder.encode(verificationToken + Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")?.substring(0, 32));
    const tokenHashBuffer = await crypto.subtle.digest('SHA-256', tokenData);
    const tokenHash = Array.from(new Uint8Array(tokenHashBuffer)).map(b => b.toString(16).padStart(2, '0')).join('');

    // Mark OTP as verified and store the verification token hash
    const { error: updateError } = await supabaseAdmin
      .from('verification_otps')
      .update({ 
        verified_at: new Date().toISOString(),
        verification_token_hash: tokenHash
      })
      .eq('id', otpRecord.id);

    if (updateError) {
      console.error("Failed to mark OTP as verified:", updateError);
      throw new Error("Verification failed");
    }

    console.log(`Email verified successfully: ${normalizedEmail}`);

    return new Response(
      JSON.stringify({ 
        success: true, 
        verified: true,
        verificationToken,
        message: "Email verified successfully"
      }),
      { status: 200, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );

  } catch (error: any) {
    console.error("Error in verify-otp:", error);
    return new Response(
      JSON.stringify({ error: error.message || "Verification failed" }),
      { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  }
};

serve(handler);
