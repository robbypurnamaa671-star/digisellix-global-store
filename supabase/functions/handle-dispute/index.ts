import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface DisputeRequest {
  action: "create" | "respond" | "resolve";
  orderId?: string;
  disputeId?: string;
  message?: string;
  decision?: string;
  inFavorOf?: "buyer" | "seller";
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

    const body: DisputeRequest = await req.json();
    const { action, orderId, disputeId, message, decision, inFavorOf } = body;

    console.log(`Handling dispute action: ${action}`);

    switch (action) {
      case "create": {
        if (!orderId || !message) {
          throw new Error("Order ID and message are required");
        }

        // Get order details
        const { data: order, error: orderError } = await supabase
          .from("orders")
          .select("*")
          .eq("id", orderId)
          .single();

        if (orderError || !order) {
          throw new Error("Order not found");
        }

        if (order.buyer_id !== user.id) {
          throw new Error("Only the buyer can create a dispute");
        }

        if (order.escrow_status !== "held") {
          throw new Error("Can only dispute orders with held escrow");
        }

        // Check if dispute already exists
        const { data: existingDispute } = await supabase
          .from("disputes")
          .select("id")
          .eq("order_id", orderId)
          .single();

        if (existingDispute) {
          throw new Error("A dispute already exists for this order");
        }

        // Create dispute
        const { data: dispute, error: disputeError } = await supabase
          .from("disputes")
          .insert({
            order_id: orderId,
            buyer_id: order.buyer_id,
            seller_id: order.seller_id,
            buyer_message: message,
            status: "open",
          })
          .select()
          .single();

        if (disputeError) {
          console.error("Dispute creation error:", disputeError);
          throw new Error("Failed to create dispute");
        }

        // Update order escrow status
        await supabase
          .from("orders")
          .update({ escrow_status: "disputed" })
          .eq("id", orderId);

        console.log(`Dispute created: ${dispute.id}`);

        return new Response(
          JSON.stringify({
            success: true,
            dispute_id: dispute.id,
            status: "open",
            message: "Dispute created successfully",
          }),
          {
            headers: { ...corsHeaders, "Content-Type": "application/json" },
            status: 200,
          }
        );
      }

      case "respond": {
        if (!disputeId || !message) {
          throw new Error("Dispute ID and message are required");
        }

        // Get dispute
        const { data: dispute, error: disputeError } = await supabase
          .from("disputes")
          .select("*")
          .eq("id", disputeId)
          .single();

        if (disputeError || !dispute) {
          throw new Error("Dispute not found");
        }

        if (dispute.seller_id !== user.id) {
          throw new Error("Only the seller can respond to this dispute");
        }

        if (dispute.status !== "open") {
          throw new Error("Can only respond to open disputes");
        }

        // Update dispute with seller response
        const { error: updateError } = await supabase
          .from("disputes")
          .update({
            seller_response: message,
            status: "under_review",
          })
          .eq("id", disputeId);

        if (updateError) {
          throw new Error("Failed to update dispute");
        }

        console.log(`Seller responded to dispute: ${disputeId}`);

        return new Response(
          JSON.stringify({
            success: true,
            dispute_id: disputeId,
            status: "under_review",
            message: "Response submitted successfully",
          }),
          {
            headers: { ...corsHeaders, "Content-Type": "application/json" },
            status: 200,
          }
        );
      }

      case "resolve": {
        if (!disputeId || !decision || !inFavorOf) {
          throw new Error("Dispute ID, decision, and inFavorOf are required");
        }

        // Check if user is admin
        const { data: userRole } = await supabase
          .from("user_roles")
          .select("role")
          .eq("user_id", user.id)
          .eq("role", "admin")
          .single();

        if (!userRole) {
          throw new Error("Only admins can resolve disputes");
        }

        // Use the database function to resolve
        const { data, error } = await supabase.rpc("admin_resolve_dispute", {
          p_dispute_id: disputeId,
          p_decision: decision,
          p_in_favor_of: inFavorOf,
        });

        if (error) {
          console.error("Resolve dispute error:", error);
          throw new Error("Failed to resolve dispute");
        }

        console.log(`Dispute resolved: ${disputeId} in favor of ${inFavorOf}`);

        return new Response(
          JSON.stringify({
            success: true,
            dispute_id: disputeId,
            resolved_in_favor_of: inFavorOf,
            message: `Dispute resolved in favor of ${inFavorOf}`,
          }),
          {
            headers: { ...corsHeaders, "Content-Type": "application/json" },
            status: 200,
          }
        );
      }

      default:
        throw new Error("Invalid action");
    }
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    console.error("Dispute handling error:", error);
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
