import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface CreateOrderRequest {
  productId: string;
  currency: "USD" | "IDR";
  affiliateCode?: string;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // All order operations require authentication
    const authHeader = req.headers.get("Authorization")?.replace("Bearer ", "");
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: "Authorization required" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 401 }
      );
    }

    const { data: { user }, error: authError } = await supabase.auth.getUser(authHeader);
    if (authError || !user) {
      return new Response(
        JSON.stringify({ error: "Invalid token" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 401 }
      );
    }

    const url = new URL(req.url);
    const pathParts = url.pathname.split("/").filter(Boolean);
    const orderId = pathParts[pathParts.length - 1];
    const isUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(orderId);

    // GET single order
    if (req.method === "GET" && isUUID) {
      console.log(`Fetching order: ${orderId} for user ${user.id}`);

      const { data: order, error } = await supabase
        .from("orders")
        .select(`
          *,
          product:products(id, title, thumbnail_url, seller_id),
          buyer:profiles!orders_buyer_id_fkey(id, full_name),
          dispute:disputes(id, status, created_at)
        `)
        .eq("id", orderId)
        .or(`buyer_id.eq.${user.id},seller_id.eq.${user.id}`)
        .single();

      if (error || !order) {
        return new Response(
          JSON.stringify({ error: "Order not found" }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 404 }
        );
      }

      return new Response(
        JSON.stringify({ success: true, data: order }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 200 }
      );
    }

    // GET orders list (buyer or seller)
    if (req.method === "GET") {
      const role = url.searchParams.get("role") || "buyer";
      const status = url.searchParams.get("status");
      const page = Number(url.searchParams.get("page")) || 1;
      const limit = Math.min(Number(url.searchParams.get("limit")) || 20, 50);

      console.log(`Fetching orders for ${role} ${user.id}`);

      let query = supabase
        .from("orders")
        .select(`
          id, amount_usd, amount_idr, currency, payment_status, escrow_status,
          created_at, paid_at, buyer_confirmed_at, auto_release_at,
          product:products(id, title, thumbnail_url),
          dispute:disputes(id, status)
        `, { count: "exact" });

      if (role === "seller") {
        query = query.eq("seller_id", user.id);
      } else {
        query = query.eq("buyer_id", user.id);
      }

      if (status) {
        query = query.eq("payment_status", status);
      }

      query = query.order("created_at", { ascending: false });

      const from = (page - 1) * limit;
      query = query.range(from, from + limit - 1);

      const { data: orders, error, count } = await query;

      if (error) {
        console.error("Orders query error:", error);
        throw new Error("Failed to fetch orders");
      }

      return new Response(
        JSON.stringify({
          success: true,
          data: orders,
          pagination: {
            page,
            limit,
            total: count,
            totalPages: Math.ceil((count || 0) / limit),
          },
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 200 }
      );
    }

    // POST - Create order
    if (req.method === "POST") {
      const body: CreateOrderRequest = await req.json();
      const { productId, currency, affiliateCode } = body;

      if (!productId || !currency) {
        return new Response(
          JSON.stringify({ error: "Product ID and currency are required" }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 400 }
        );
      }

      // Get product
      const { data: product, error: productError } = await supabase
        .from("products")
        .select("*")
        .eq("id", productId)
        .eq("status", "active")
        .single();

      if (productError || !product) {
        return new Response(
          JSON.stringify({ error: "Product not found or unavailable" }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 404 }
        );
      }

      // Check if buyer is trying to buy their own product
      if (product.seller_id === user.id) {
        return new Response(
          JSON.stringify({ error: "Cannot purchase your own product" }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 400 }
        );
      }

      // Check seller status
      const { data: sellerProfile } = await supabase
        .from("seller_profiles")
        .select("is_suspended")
        .eq("user_id", product.seller_id)
        .single();

      if (sellerProfile?.is_suspended) {
        return new Response(
          JSON.stringify({ error: "Seller is currently unavailable" }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 400 }
        );
      }

      // Get affiliate if code provided
      let referredBy = null;
      if (affiliateCode && product.affiliate_enabled) {
        const { data: affiliate } = await supabase
          .from("affiliates")
          .select("id")
          .eq("affiliate_code", affiliateCode)
          .single();
        
        if (affiliate) {
          referredBy = affiliate.id;
        }
      }

      // Get platform fee
      const { data: feeSettings } = await supabase
        .from("platform_settings")
        .select("value")
        .eq("key", "platform_fee_percent")
        .single();

      const platformFeePercent = feeSettings?.value ? Number(feeSettings.value) : 10;

      // Create order
      const { data: order, error: orderError } = await supabase
        .from("orders")
        .insert({
          buyer_id: user.id,
          product_id: productId,
          seller_id: product.seller_id,
          amount_usd: product.price_usd,
          amount_idr: product.price_idr,
          currency,
          payment_status: "pending",
          escrow_status: "held",
          platform_fee_percent: platformFeePercent,
          referred_by: referredBy,
        })
        .select()
        .single();

      if (orderError) {
        console.error("Order creation error:", orderError);
        throw new Error("Failed to create order");
      }

      console.log(`Order created: ${order.id} for product ${productId}`);

      return new Response(
        JSON.stringify({
          success: true,
          data: order,
          message: "Order created. Proceed to payment.",
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 201 }
      );
    }

    return new Response(
      JSON.stringify({ error: "Method not allowed" }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 405 }
    );

  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    console.error("Orders API error:", error);
    return new Response(
      JSON.stringify({ success: false, error: errorMessage }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 500 }
    );
  }
});
