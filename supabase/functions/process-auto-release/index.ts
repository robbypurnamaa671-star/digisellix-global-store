import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log("Starting auto-release processing...");

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Call the database function to process auto-releases
    const { data, error } = await supabase.rpc("process_auto_releases");

    if (error) {
      console.error("Error processing auto-releases:", error);
      throw error;
    }

    const releasedCount = data || 0;
    console.log(`Auto-release processed: ${releasedCount} orders released`);

    // Log the action
    if (releasedCount > 0) {
      // Get the orders that were just released for logging
      const { data: releasedOrders } = await supabase
        .from("orders")
        .select("id, seller_id, amount_usd")
        .eq("escrow_status", "released")
        .gte("escrow_released_at", new Date(Date.now() - 60000).toISOString());

      console.log("Released orders:", releasedOrders);

      // Update transaction payout status for released orders
      if (releasedOrders && releasedOrders.length > 0) {
        for (const order of releasedOrders) {
          await supabase
            .from("transactions")
            .update({ payout_status: "pending" })
            .eq("order_id", order.id)
            .eq("payout_status", "frozen");
        }
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        released_count: releasedCount,
        message: `Processed ${releasedCount} auto-releases`,
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      }
    );
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    console.error("Auto-release processing error:", error);
    return new Response(
      JSON.stringify({
        success: false,
        error: errorMessage,
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 500,
      }
    );
  }
});
