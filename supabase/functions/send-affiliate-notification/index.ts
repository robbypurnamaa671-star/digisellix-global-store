import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface NotificationRequest {
  type: "commission_available" | "payout_paid" | "payout_rejected";
  affiliate_id: string;
  amount: number;
  admin_notes?: string;
}

const handler = async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { type, affiliate_id, amount, admin_notes }: NotificationRequest = await req.json();

    console.log("Processing affiliate notification:", { type, affiliate_id, amount });

    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
      { auth: { persistSession: false } }
    );

    // Get affiliate user details
    const { data: affiliate, error: affiliateError } = await supabaseClient
      .from("affiliates")
      .select("user_id, affiliate_code")
      .eq("id", affiliate_id)
      .single();

    if (affiliateError || !affiliate) {
      console.error("Error fetching affiliate:", affiliateError);
      throw new Error("Affiliate not found");
    }

    // Get user email from auth
    const { data: userData, error: userError } = await supabaseClient.auth.admin.getUserById(
      affiliate.user_id
    );

    if (userError || !userData?.user?.email) {
      console.error("Error fetching user:", userError);
      throw new Error("User email not found");
    }

    // Get user profile for name
    const { data: profile } = await supabaseClient
      .from("profiles")
      .select("full_name")
      .eq("id", affiliate.user_id)
      .single();

    const userName = profile?.full_name || "Affiliate";
    const userEmail = userData.user.email;
    const formattedAmount = `$${amount.toFixed(2)}`;

    let subject = "";
    let htmlContent = "";

    switch (type) {
      case "commission_available":
        subject = "Your Affiliate Commission is Now Available!";
        htmlContent = `
          <h1>Great news, ${userName}!</h1>
          <p>Your affiliate commission of <strong>${formattedAmount}</strong> is now available for withdrawal.</p>
          <p>The 7-day refund period has passed, and you can now request a payout from your affiliate dashboard.</p>
          <p>Best regards,<br>The Digisellix Team</p>
        `;
        break;

      case "payout_paid":
        subject = "Your Payout Has Been Processed!";
        htmlContent = `
          <h1>Payment Confirmation, ${userName}!</h1>
          <p>Your payout request of <strong>${formattedAmount}</strong> has been processed and paid.</p>
          ${admin_notes ? `<p><strong>Admin Notes:</strong> ${admin_notes}</p>` : ""}
          <p>Thank you for being part of our affiliate program!</p>
          <p>Best regards,<br>The Digisellix Team</p>
        `;
        break;

      case "payout_rejected":
        subject = "Payout Request Update";
        htmlContent = `
          <h1>Payout Request Update, ${userName}</h1>
          <p>Unfortunately, your payout request of <strong>${formattedAmount}</strong> could not be processed at this time.</p>
          ${admin_notes ? `<p><strong>Reason:</strong> ${admin_notes}</p>` : ""}
          <p>Please contact support if you have any questions.</p>
          <p>Best regards,<br>The Digisellix Team</p>
        `;
        break;
    }

    const emailResponse = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${RESEND_API_KEY}`,
      },
      body: JSON.stringify({
        from: "Digisellix <onboarding@resend.dev>",
        to: [userEmail],
        subject,
        html: htmlContent,
      }),
    });

    const emailResult = await emailResponse.json();
    console.log("Email sent:", emailResult);

    return new Response(
      JSON.stringify({ success: true, message: "Notification sent" }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error: any) {
    console.error("Error in send-affiliate-notification:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
};

serve(handler);
