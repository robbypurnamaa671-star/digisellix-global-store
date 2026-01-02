import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface VerificationRequest {
  ktpName: string;
  ktpNumber: string;
  ktpImageUrl: string;
  selfieImageUrl?: string;
  bankName: string;
  bankAccountNumber: string;
  bankAccountName: string;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Get user from auth header
    const authHeader = req.headers.get("Authorization")?.replace("Bearer ", "");
    if (!authHeader) {
      throw new Error("No authorization header");
    }

    const { data: { user }, error: authError } = await supabase.auth.getUser(authHeader);
    if (authError || !user) {
      throw new Error("Unauthorized");
    }

    // Check if user is a seller
    const { data: sellerRole } = await supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", user.id)
      .eq("role", "seller")
      .single();

    if (!sellerRole) {
      throw new Error("Only sellers can submit verification");
    }

    const body: VerificationRequest = await req.json();
    const { ktpName, ktpNumber, ktpImageUrl, selfieImageUrl, bankName, bankAccountNumber, bankAccountName } = body;

    // Validate required fields
    if (!ktpName || !ktpNumber || !ktpImageUrl || !bankName || !bankAccountNumber || !bankAccountName) {
      throw new Error("Missing required fields");
    }

    console.log(`Processing verification submission for seller ${user.id}`);

    // Check if verification already exists
    const { data: existingVerification } = await supabase
      .from("seller_verifications")
      .select("id, verification_status")
      .eq("seller_id", user.id)
      .single();

    if (existingVerification) {
      if (existingVerification.verification_status === "approved") {
        throw new Error("Verification already approved");
      }

      // Update existing pending/rejected verification
      const { data: updated, error: updateError } = await supabase
        .from("seller_verifications")
        .update({
          ktp_name: ktpName,
          ktp_number: ktpNumber,
          ktp_image_url: ktpImageUrl,
          selfie_image_url: selfieImageUrl || null,
          bank_name: bankName,
          bank_account_number: bankAccountNumber,
          bank_account_name: bankAccountName,
          verification_status: "pending",
          rejection_reason: null,
          updated_at: new Date().toISOString(),
        })
        .eq("id", existingVerification.id)
        .select()
        .single();

      if (updateError) {
        console.error("Update error:", updateError);
        throw new Error("Failed to update verification");
      }

      // Update seller_profiles verification status
      await supabase
        .from("seller_profiles")
        .update({ verification_status: "pending" })
        .eq("user_id", user.id);

      console.log(`Verification updated for seller ${user.id}`);

      return new Response(
        JSON.stringify({
          success: true,
          verification_id: updated.id,
          status: "pending",
          message: "Verification resubmitted successfully",
        }),
        {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
          status: 200,
        }
      );
    }

    // Create new verification
    const { data: verification, error: insertError } = await supabase
      .from("seller_verifications")
      .insert({
        seller_id: user.id,
        ktp_name: ktpName,
        ktp_number: ktpNumber,
        ktp_image_url: ktpImageUrl,
        selfie_image_url: selfieImageUrl || null,
        bank_name: bankName,
        bank_account_number: bankAccountNumber,
        bank_account_name: bankAccountName,
        verification_status: "pending",
      })
      .select()
      .single();

    if (insertError) {
      console.error("Insert error:", insertError);
      throw new Error("Failed to create verification");
    }

    // Update seller_profiles verification status
    await supabase
      .from("seller_profiles")
      .update({ verification_status: "pending" })
      .eq("user_id", user.id);

    console.log(`Verification created for seller ${user.id}: ${verification.id}`);

    return new Response(
      JSON.stringify({
        success: true,
        verification_id: verification.id,
        status: "pending",
        message: "Verification submitted successfully. Please wait for admin review.",
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      }
    );
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    console.error("Verification submission error:", error);
    return new Response(
      JSON.stringify({
        success: false,
        error: errorMessage,
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 400,
      }
    );
  }
});
