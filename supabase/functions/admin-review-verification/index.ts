import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface ReviewRequest {
  verificationId: string;
  action: "approve" | "reject";
  rejectionReason?: string;
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

    // Check if user is an admin
    const { data: adminRole } = await supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", user.id)
      .eq("role", "admin")
      .single();

    if (!adminRole) {
      throw new Error("Only admins can review verifications");
    }

    const body: ReviewRequest = await req.json();
    const { verificationId, action, rejectionReason } = body;

    if (!verificationId || !action) {
      throw new Error("Missing required fields");
    }

    if (action === "reject" && !rejectionReason) {
      throw new Error("Rejection reason is required");
    }

    console.log(`Admin ${user.id} reviewing verification ${verificationId}: ${action}`);

    // Get the verification
    const { data: verification, error: fetchError } = await supabase
      .from("seller_verifications")
      .select("*, profiles(full_name)")
      .eq("id", verificationId)
      .single();

    if (fetchError || !verification) {
      throw new Error("Verification not found");
    }

    if (verification.verification_status !== "pending") {
      throw new Error("Verification has already been reviewed");
    }

    // Update verification status
    const updateData: Record<string, unknown> = {
      verification_status: action === "approve" ? "approved" : "rejected",
      reviewed_by: user.id,
      updated_at: new Date().toISOString(),
    };

    if (action === "approve") {
      updateData.verified_at = new Date().toISOString();
    } else {
      updateData.rejection_reason = rejectionReason;
    }

    const { error: updateError } = await supabase
      .from("seller_verifications")
      .update(updateData)
      .eq("id", verificationId);

    if (updateError) {
      console.error("Update error:", updateError);
      throw new Error("Failed to update verification");
    }

    // The trigger will automatically update seller_profiles.escrow_enabled and verification_status

    // Log admin action
    await supabase
      .from("admin_actions")
      .insert({
        admin_id: user.id,
        action_type: action === "approve" ? "approve_verification" : "reject_verification",
        target_type: "seller_verification",
        target_id: verificationId,
        details: {
          seller_id: verification.seller_id,
          action: action,
          rejection_reason: rejectionReason || null,
        },
      });

    console.log(`Verification ${verificationId} ${action}ed by admin ${user.id}`);

    return new Response(
      JSON.stringify({
        success: true,
        verification_id: verificationId,
        status: action === "approve" ? "approved" : "rejected",
        message: action === "approve" 
          ? "Seller verification approved. Escrow is now enabled." 
          : "Seller verification rejected.",
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      }
    );
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    console.error("Verification review error:", error);
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
