import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface ContactRequest {
  name: string;
  email: string;
  subject: string;
  message: string;
}

/**
 * Escape HTML special characters to prevent XSS injection
 */
function escapeHtml(unsafe: string): string {
  return unsafe
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

/**
 * Validate email format
 */
function isValidEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email) && email.length <= 255;
}

/**
 * Validate and sanitize input fields
 */
function validateInput(data: ContactRequest): { valid: boolean; error?: string } {
  // Check required fields
  if (!data.name || !data.email || !data.subject || !data.message) {
    return { valid: false, error: "All fields are required" };
  }

  // Validate lengths
  if (data.name.length > 100) {
    return { valid: false, error: "Name must be less than 100 characters" };
  }
  if (data.subject.length > 200) {
    return { valid: false, error: "Subject must be less than 200 characters" };
  }
  if (data.message.length > 5000) {
    return { valid: false, error: "Message must be less than 5000 characters" };
  }

  // Validate email format
  if (!isValidEmail(data.email)) {
    return { valid: false, error: "Invalid email address" };
  }

  // Check for CRLF injection in email
  if (data.email.includes('\r') || data.email.includes('\n')) {
    return { valid: false, error: "Invalid characters in email" };
  }

  return { valid: true };
}

const handler = async (req: Request): Promise<Response> => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const requestData: ContactRequest = await req.json();
    
    // Validate input
    const validation = validateInput(requestData);
    if (!validation.valid) {
      console.error("Validation failed:", validation.error);
      return new Response(
        JSON.stringify({ error: validation.error }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const { name, email, subject, message } = requestData;

    // Log safely without sensitive data
    console.log("Received contact form submission from:", email);

    // Escape all user input for HTML embedding
    const safeName = escapeHtml(name);
    const safeEmail = escapeHtml(email);
    const safeSubject = escapeHtml(subject);
    const safeMessage = escapeHtml(message).replace(/\n/g, '<br>');

    // Send notification to admin using Resend API directly
    const adminEmailResponse = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${RESEND_API_KEY}`,
      },
      body: JSON.stringify({
        from: "Digisellix <onboarding@resend.dev>",
        to: ["admin@digisellix.com"],
        subject: `New Contact Form: ${safeSubject}`,
        html: `
          <h2>New Contact Form Submission</h2>
          <p><strong>Name:</strong> ${safeName}</p>
          <p><strong>Email:</strong> ${safeEmail}</p>
          <p><strong>Subject:</strong> ${safeSubject}</p>
          <p><strong>Message:</strong></p>
          <p>${safeMessage}</p>
        `,
      }),
    });

    const adminResult = await adminEmailResponse.json();
    if (!adminEmailResponse.ok) {
      console.error("Failed to send admin notification:", adminResult);
    } else {
      console.log("Admin notification sent successfully");
    }

    // Send confirmation to user
    const userEmailResponse = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${RESEND_API_KEY}`,
      },
      body: JSON.stringify({
        from: "Digisellix <onboarding@resend.dev>",
        to: [email], // Use original email for sending, not escaped
        subject: "We received your message - Digisellix",
        html: `
          <h1>Thank you for contacting us, ${safeName}!</h1>
          <p>We have received your message and will get back to you as soon as possible.</p>
          <p><strong>Your message:</strong></p>
          <blockquote style="border-left: 3px solid #ccc; padding-left: 10px; margin-left: 0;">
            ${safeMessage}
          </blockquote>
          <p>Best regards,<br>The Digisellix Team</p>
        `,
      }),
    });

    const userResult = await userEmailResponse.json();
    if (!userEmailResponse.ok) {
      console.error("Failed to send user confirmation:", userResult);
    } else {
      console.log("User confirmation sent successfully");
    }

    return new Response(
      JSON.stringify({ success: true, message: "Email sent successfully" }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    console.error("Error in send-contact-email function:", errorMessage);
    return new Response(
      JSON.stringify({ error: "Failed to process request" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
};

serve(handler);
