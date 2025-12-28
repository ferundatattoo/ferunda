import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

interface ContactEmailRequest {
  name: string;
  email: string;
  phone?: string;
  message: string;
  subject?: string;
}

const handler = async (req: Request): Promise<Response> => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { name, email, phone, message, subject }: ContactEmailRequest = await req.json();

    console.log("Sending contact email from:", name, email);

    // Send notification to Fernando
    const notificationResponse = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${RESEND_API_KEY}`,
      },
      body: JSON.stringify({
        from: "Ferunda Website <onboarding@resend.dev>",
        to: ["fernando@ferunda.com"],
        subject: subject || `New Contact: ${name}`,
        html: `
          <h2>New Contact Form Submission</h2>
          <p><strong>Name:</strong> ${name}</p>
          <p><strong>Email:</strong> ${email}</p>
          ${phone ? `<p><strong>Phone:</strong> ${phone}</p>` : ''}
          <h3>Message:</h3>
          <p>${message.replace(/\n/g, '<br>')}</p>
          <hr>
          <p style="color: #666; font-size: 12px;">Sent from ferunda.com contact form</p>
        `,
      }),
    });

    if (!notificationResponse.ok) {
      const error = await notificationResponse.text();
      console.error("Failed to send notification email:", error);
      throw new Error(`Failed to send notification: ${error}`);
    }

    console.log("Notification email sent successfully");

    // Send confirmation to the user
    const confirmationResponse = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${RESEND_API_KEY}`,
      },
      body: JSON.stringify({
        from: "Ferunda <onboarding@resend.dev>",
        to: [email],
        subject: "Thanks for reaching out - Ferunda",
        html: `
          <h1>Thank you for contacting me, ${name}!</h1>
          <p>I've received your message and will get back to you as soon as possible.</p>
          <p>If you have any urgent questions, feel free to reach me on WhatsApp at +1 (512) 850-9592.</p>
          <br>
          <p>Best,<br>Fernando Unda (Ferunda)</p>
          <p style="color: #666; font-size: 12px;">Tattoo Artist | Austin • Los Angeles • Houston</p>
        `,
      }),
    });

    if (!confirmationResponse.ok) {
      console.log("Warning: Confirmation email may have failed");
    } else {
      console.log("Confirmation email sent successfully");
    }

    return new Response(JSON.stringify({ success: true }), {
      status: 200,
      headers: {
        "Content-Type": "application/json",
        ...corsHeaders,
      },
    });
  } catch (error: any) {
    console.error("Error in send-contact-email function:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 500,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );
  }
};

serve(handler);
