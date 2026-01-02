import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface PaymentRequest {
  orderId: string;
  paymentProvider: string;
  paymentReference: string;
  amount: number;
  currency: string;
  feePayer: "buyer" | "seller";
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
    const { orderId, paymentProvider, paymentReference, amount, currency, feePayer = "buyer" } = body;

    // Validate fee_payer
    if (!["buyer", "seller"].includes(feePayer)) {
      throw new Error("Invalid fee_payer. Must be 'buyer' or 'seller'");
    }

    console.log(`Processing escrow payment for order ${orderId} with fee payer: ${feePayer}`);

    // Get the order and verify it belongs to the buyer
    const { data: order, error: orderError } = await supabase
      .from("orders")
      .select("*, products(seller_id, title, price_usd)")
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

    // Get platform fee from settings (default 5%)
    const { data: feeSettings } = await supabase
      .from("platform_settings")
      .select("value")
      .eq("key", "platform_fee_percent")
      .single();

    const platformFeePercent = feeSettings?.value ? Number(feeSettings.value) : 5;
    
    // Base product price
    const basePrice = Number(order.amount_usd);
    const platformFee = Math.round((basePrice * platformFeePercent) / 100 * 100) / 100;

    let escrowAmount: number;
    let sellerPayout: number;

    if (feePayer === "buyer") {
      // Buyer pays: price + fee, seller receives full price
      escrowAmount = basePrice + platformFee;
      sellerPayout = basePrice;
    } else {
      // Seller pays: buyer pays price, seller receives price - fee
      escrowAmount = basePrice;
      sellerPayout = basePrice - platformFee;
    }

    console.log(`Escrow calculation - Fee payer: ${feePayer}, Base: $${basePrice}, Fee: $${platformFee}, Escrow: $${escrowAmount}, Seller payout: $${sellerPayout}`);

    // Get auto-release days from settings
    const { data: releaseSettings } = await supabase
      .from("platform_settings")
      .select("value")
      .eq("key", "auto_release_days")
      .single();

    const autoReleaseDays = releaseSettings?.value ? Number(releaseSettings.value) : 7;
    const autoReleaseAt = new Date(Date.now() + autoReleaseDays * 24 * 60 * 60 * 1000).toISOString();

    // Create transaction record with escrow
    const { data: transaction, error: txError } = await supabase
      .from("transactions")
      .insert({
        order_id: orderId,
        payment_reference: paymentReference,
        payment_provider: paymentProvider,
        amount: escrowAmount,
        escrow_amount: escrowAmount,
        platform_fee: platformFee,
        seller_payout: sellerPayout,
        fee_payer: feePayer,
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
        fee_payer: feePayer,
        platform_fee_percent: platformFeePercent,
        auto_release_at: autoReleaseAt,
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
        escrow_amount: escrowAmount,
        platform_fee: platformFee,
        seller_payout: sellerPayout,
        fee_payer: feePayer,
        auto_release_at: autoReleaseAt,
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
