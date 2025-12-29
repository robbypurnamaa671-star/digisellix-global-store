import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface ConfirmDeliveryRequest {
  orderId: string;
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

    const body: ConfirmDeliveryRequest = await req.json();
    const { orderId } = body;

    if (!orderId) {
      throw new Error("Order ID is required");
    }

    console.log(`Confirming delivery for order ${orderId} by user ${user.id}`);

    // Get the order
    const { data: order, error: orderError } = await supabase
      .from("orders")
      .select("*")
      .eq("id", orderId)
      .single();

    if (orderError || !order) {
      throw new Error("Order not found");
    }

    if (order.buyer_id !== user.id) {
      throw new Error("Only the buyer can confirm delivery");
    }

    if (order.escrow_status !== "held") {
      throw new Error("Order is not in escrow");
    }

    if (order.payment_status !== "paid") {
      throw new Error("Order is not paid");
    }

    // Check if there's an open dispute
    const { data: dispute } = await supabase
      .from("disputes")
      .select("id, status")
      .eq("order_id", orderId)
      .in("status", ["open", "under_review"])
      .single();

    if (dispute) {
      throw new Error("Cannot confirm delivery while there is an open dispute");
    }

    // Release escrow
    const { error: updateError } = await supabase
      .from("orders")
      .update({
        escrow_status: "released",
        escrow_released_at: new Date().toISOString(),
        buyer_confirmed_at: new Date().toISOString(),
      })
      .eq("id", orderId);

    if (updateError) {
      console.error("Order update error:", updateError);
      throw new Error("Failed to release escrow");
    }

    // Update transaction to pending payout
    await supabase
      .from("transactions")
      .update({ payout_status: "pending" })
      .eq("order_id", orderId);

    console.log(`Delivery confirmed and escrow released for order ${orderId}`);

    return new Response(
      JSON.stringify({
        success: true,
        message: "Delivery confirmed. Funds released to seller.",
        escrow_status: "released",
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      }
    );
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    console.error("Confirm delivery error:", error);
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
