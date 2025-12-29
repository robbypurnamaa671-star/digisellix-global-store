import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface PaymentRequest {
  orderId: string;
  paymentProvider: string; // 'paypal' | 'stripe' | 'ipaymu'
  paymentReference: string;
  amount: number;
  currency: string;
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

    const body: PaymentRequest = await req.json();
    const { orderId, paymentProvider, paymentReference, amount, currency } = body;

    console.log(`Processing escrow payment for order ${orderId}`);

    // Get the order and verify it belongs to the buyer
    const { data: order, error: orderError } = await supabase
      .from("orders")
      .select("*, products(seller_id, title)")
      .eq("id", orderId)
      .single();

    if (orderError || !order) {
      throw new Error("Order not found");
    }

    if (order.buyer_id !== user.id) {
      throw new Error("Unauthorized: Not the buyer of this order");
    }

    if (order.payment_status === "paid") {
      throw new Error("Order already paid");
    }

    // Get platform fee from settings
    const { data: feeSettings } = await supabase
      .from("platform_settings")
      .select("value")
      .eq("key", "platform_fee_percent")
      .single();

    const platformFeePercent = feeSettings?.value ? Number(feeSettings.value) : 10;
    const platformFee = (amount * platformFeePercent) / 100;
    const sellerPayout = amount - platformFee;

    // Create transaction record with escrow
    const { data: transaction, error: txError } = await supabase
      .from("transactions")
      .insert({
        order_id: orderId,
        payment_reference: paymentReference,
        payment_provider: paymentProvider,
        amount: amount,
        platform_fee: platformFee,
        seller_payout: sellerPayout,
        payout_status: "frozen", // Held in escrow until release
      })
      .select()
      .single();

    if (txError) {
      console.error("Transaction creation error:", txError);
      throw new Error("Failed to create transaction");
    }

    // Update order status
    const { error: updateError } = await supabase
      .from("orders")
      .update({
        payment_status: "paid",
        paid_at: new Date().toISOString(),
        escrow_status: "held",
        payment_method: paymentProvider,
      })
      .eq("id", orderId);

    if (updateError) {
      console.error("Order update error:", updateError);
      throw new Error("Failed to update order status");
    }

    console.log(`Escrow payment created: Transaction ${transaction.id} for order ${orderId}`);

    return new Response(
      JSON.stringify({
        success: true,
        transaction_id: transaction.id,
        escrow_status: "held",
        platform_fee: platformFee,
        seller_payout: sellerPayout,
        message: "Payment received and held in escrow",
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      }
    );
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    console.error("Escrow payment error:", error);
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
