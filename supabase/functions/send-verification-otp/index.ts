import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";
import { Resend } from "npm:resend@2.0.0";

const resend = new Resend(Deno.env.get("RESEND_API_KEY"));

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

// Generate 6-digit OTP
function generateOTP(): string {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

// Simple hash function for OTP storage
async function hashOTP(otp: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(otp + Deno.env.get("CHAT_SESSION_SECRET"));
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

interface OTPRequest {
  email: string;
  name?: string;
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

    const { email, name }: OTPRequest = await req.json();
    
    // Validate email
    if (!email || !email.includes('@') || email.length > 255) {
      return new Response(
        JSON.stringify({ error: "Valid email required" }),
        { status: 400, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    const normalizedEmail = email.trim().toLowerCase();
    const ipAddress = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 
                      req.headers.get('cf-connecting-ip') || 'unknown';
    const fingerprintHash = req.headers.get('x-fingerprint-hash') || null;

    // Rate limiting: max 3 OTPs per email per hour
    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000).toISOString();
    const { count: recentAttempts } = await supabaseAdmin
      .from('verification_otps')
      .select('*', { count: 'exact', head: true })
      .eq('email', normalizedEmail)
      .gte('created_at', oneHourAgo);

    if (recentAttempts && recentAttempts >= 3) {
      console.log(`Rate limit exceeded for email: ${normalizedEmail}`);
      return new Response(
        JSON.stringify({ error: "Too many verification attempts. Please try again later." }),
        { status: 429, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    // Generate OTP and hash
    const otp = generateOTP();
    const otpHash = await hashOTP(otp);
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes

    // Store OTP in database
    const { error: insertError } = await supabaseAdmin
      .from('verification_otps')
      .insert({
        email: normalizedEmail,
        otp_hash: otpHash,
        expires_at: expiresAt.toISOString(),
        ip_address: ipAddress,
        fingerprint_hash: fingerprintHash,
      });

    if (insertError) {
      console.error("Failed to store OTP:", insertError);
      throw new Error("Failed to generate verification code");
    }

    // Send email with OTP
    const emailResponse = await resend.emails.send({
      from: "Ferunda Ink <noreply@ferunda.com>",
      to: [normalizedEmail],
      subject: "Your Verification Code - Ferunda Ink",
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
        </head>
        <body style="font-family: 'Helvetica Neue', Arial, sans-serif; background-color: #0a0a0a; color: #ffffff; padding: 40px 20px; margin: 0;">
          <div style="max-width: 480px; margin: 0 auto; text-align: center;">
            <h1 style="font-size: 24px; font-weight: 300; letter-spacing: 0.1em; margin-bottom: 8px;">
              FERUNDA INK
            </h1>
            <p style="color: #888888; font-size: 12px; letter-spacing: 0.2em; text-transform: uppercase; margin-bottom: 40px;">
              Luxury Tattoo Artistry
            </p>
            
            <div style="background-color: #141414; border: 1px solid #222222; padding: 40px; margin-bottom: 24px;">
              <p style="color: #888888; font-size: 14px; margin-bottom: 24px;">
                ${name ? `Hi ${name},` : 'Hi,'}<br><br>
                Your verification code is:
              </p>
              
              <div style="font-size: 36px; font-weight: 600; letter-spacing: 0.3em; color: #ffffff; margin: 24px 0;">
                ${otp}
              </div>
              
              <p style="color: #666666; font-size: 12px; margin-top: 24px;">
                This code expires in 10 minutes.
              </p>
            </div>
            
            <p style="color: #666666; font-size: 12px;">
              If you didn't request this code, you can safely ignore this email.
            </p>
          </div>
        </body>
        </html>
      `,
    });

    console.log("Verification email sent:", emailResponse);

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: "Verification code sent to your email",
        expiresIn: 600 // 10 minutes in seconds
      }),
      { status: 200, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );

  } catch (error: any) {
    console.error("Error in send-verification-otp:", error);
    return new Response(
      JSON.stringify({ error: error.message || "Failed to send verification code" }),
      { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  }
};

serve(handler);
