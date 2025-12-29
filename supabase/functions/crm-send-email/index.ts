import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

interface EmailRequest {
  to: string;
  subject: string;
  body: string;
  customerName?: string;
  bookingId?: string;
  replyToEmailId?: string;
}

// =============================================================================
// HTML SANITIZATION - Prevent XSS in email content
// =============================================================================
const ALLOWED_TAGS = ['p', 'br', 'strong', 'em', 'b', 'i', 'u', 'ul', 'ol', 'li', 'a', 'span', 'div', 'h1', 'h2', 'h3', 'h4'];
const ALLOWED_ATTRS: Record<string, string[]> = {
  'a': ['href'],
  'span': ['style'],
  'div': ['style'],
  'p': ['style'],
};

function escapeHtml(text: string): string {
  const map: Record<string, string> = {
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#x27;',
  };
  return text.replace(/[&<>"']/g, (char) => map[char] || char);
}

function sanitizeHtml(html: string): string {
  // For simple plain text emails, just escape HTML and convert newlines
  // This prevents any HTML/script injection while preserving formatting
  const escaped = escapeHtml(html);
  return escaped.replace(/\n/g, '<br>');
}

function validateUrl(url: string): boolean {
  try {
    const parsed = new URL(url);
    return ['http:', 'https:'].includes(parsed.protocol);
  } catch {
    return false;
  }
}

// =============================================================================
// INPUT VALIDATION
// =============================================================================
function validateEmail(email: string): boolean {
  if (!email || typeof email !== 'string') return false;
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email) && email.length <= 255;
}

function validateEmailRequest(req: EmailRequest): { valid: boolean; error?: string } {
  if (!validateEmail(req.to)) {
    return { valid: false, error: "Invalid recipient email" };
  }
  
  if (!req.subject || typeof req.subject !== 'string' || req.subject.length > 200) {
    return { valid: false, error: "Invalid subject (max 200 characters)" };
  }
  
  if (!req.body || typeof req.body !== 'string' || req.body.length > 50000) {
    return { valid: false, error: "Invalid body (max 50000 characters)" };
  }
  
  if (req.customerName && (typeof req.customerName !== 'string' || req.customerName.length > 100)) {
    return { valid: false, error: "Invalid customer name" };
  }
  
  if (req.bookingId && typeof req.bookingId !== 'string') {
    return { valid: false, error: "Invalid booking ID" };
  }
  
  return { valid: true };
}

const handler = async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      throw new Error("No authorization header");
    }

    // Verify user is admin
    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_ANON_KEY") ?? "",
      { global: { headers: { Authorization: authHeader } } }
    );

    const { data: { user }, error: authError } = await supabaseClient.auth.getUser();
    if (authError || !user) {
      throw new Error("Unauthorized");
    }

    // Check if user has admin role
    const { data: roleData } = await supabaseClient
      .from("user_roles")
      .select("role")
      .eq("user_id", user.id)
      .eq("role", "admin")
      .single();

    if (!roleData) {
      throw new Error("Admin access required");
    }

    const emailRequest: EmailRequest = await req.json();
    
    // Validate request
    const validation = validateEmailRequest(emailRequest);
    if (!validation.valid) {
      return new Response(
        JSON.stringify({ error: validation.error }),
        { status: 400, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    const { to, subject, body, customerName, bookingId } = emailRequest;

    console.log("[CRM-EMAIL] Sending email to:", to, "Subject:", subject);

    // Sanitize the body content to prevent XSS
    const sanitizedBody = sanitizeHtml(body);

    // Send the email via Resend API
    const emailResponse = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${RESEND_API_KEY}`,
      },
      body: JSON.stringify({
        from: "Fernando Unda <fernando@ferunda.com>",
        to: [to],
        subject: subject.substring(0, 200),
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            ${sanitizedBody}
            <hr style="margin-top: 30px; border: none; border-top: 1px solid #eee;">
            <p style="color: #666; font-size: 12px;">
              Fernando Unda (Ferunda)<br>
              Tattoo Artist | Austin • Los Angeles • Houston<br>
              <a href="https://ferunda.com" style="color: #666;">ferunda.com</a>
            </p>
          </div>
        `,
        reply_to: "fernando@ferunda.com",
      }),
    });

    if (!emailResponse.ok) {
      const errorText = await emailResponse.text();
      console.error("[CRM-EMAIL] Resend error:", errorText);
      throw new Error(`Failed to send email: ${errorText}`);
    }

    const emailResult = await emailResponse.json();
    console.log("[CRM-EMAIL] Email sent successfully:", emailResult.id);

    // Use service role for database operations
    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    // Save the email to customer_emails table
    const { error: saveError } = await supabaseAdmin.from("customer_emails").insert({
      customer_email: to,
      customer_name: customerName?.substring(0, 100) || null,
      subject: subject.substring(0, 200),
      email_body: body.substring(0, 50000),
      direction: "outbound",
      booking_id: bookingId || null,
      is_read: true,
    });

    if (saveError) {
      console.error("[CRM-EMAIL] Failed to save email to database:", saveError);
    }

    return new Response(
      JSON.stringify({ 
        success: true, 
        emailId: emailResult.id 
      }),
      {
        status: 200,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );
  } catch (error: any) {
    console.error("[CRM-EMAIL] Error:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: error.message === "Unauthorized" || error.message === "Admin access required" ? 401 : 500,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );
  }
};

serve(handler);
