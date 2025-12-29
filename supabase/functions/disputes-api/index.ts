import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // All dispute operations require authentication
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
    const disputeId = pathParts[pathParts.length - 1];
    const isUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(disputeId);

    // GET single dispute
    if (req.method === "GET" && isUUID) {
      console.log(`Fetching dispute: ${disputeId} for user ${user.id}`);

      const { data: dispute, error } = await supabase
        .from("disputes")
        .select(`
          *,
          order:orders(id, amount_usd, amount_idr, currency, product:products(title, thumbnail_url)),
          buyer:profiles!disputes_buyer_id_fkey(full_name),
          seller:profiles!disputes_seller_id_fkey(full_name)
        `)
        .eq("id", disputeId)
        .or(`buyer_id.eq.${user.id},seller_id.eq.${user.id}`)
        .single();

      if (error || !dispute) {
        return new Response(
          JSON.stringify({ error: "Dispute not found" }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 404 }
        );
      }

      return new Response(
        JSON.stringify({ success: true, data: dispute }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 200 }
      );
    }

    // GET disputes list
    if (req.method === "GET") {
      const role = url.searchParams.get("role") || "buyer";
      const status = url.searchParams.get("status");
      const page = Number(url.searchParams.get("page")) || 1;
      const limit = Math.min(Number(url.searchParams.get("limit")) || 20, 50);

      console.log(`Fetching disputes for ${role} ${user.id}`);

      let query = supabase
        .from("disputes")
        .select(`
          id, status, buyer_message, seller_response, admin_decision, created_at, resolved_at,
          order:orders(id, amount_usd, product:products(title))
        `, { count: "exact" });

      if (role === "seller") {
        query = query.eq("seller_id", user.id);
      } else {
        query = query.eq("buyer_id", user.id);
      }

      if (status) {
        query = query.eq("status", status);
      }

      query = query.order("created_at", { ascending: false });

      const from = (page - 1) * limit;
      query = query.range(from, from + limit - 1);

      const { data: disputes, error, count } = await query;

      if (error) {
        console.error("Disputes query error:", error);
        throw new Error("Failed to fetch disputes");
      }

      return new Response(
        JSON.stringify({
          success: true,
          data: disputes,
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

    // POST - Create dispute
    if (req.method === "POST") {
      const body = await req.json();
      const { orderId, message } = body;

      if (!orderId || !message) {
        return new Response(
          JSON.stringify({ error: "Order ID and message are required" }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 400 }
        );
      }

      // Get order
      const { data: order, error: orderError } = await supabase
        .from("orders")
        .select("*")
        .eq("id", orderId)
        .eq("buyer_id", user.id)
        .single();

      if (orderError || !order) {
        return new Response(
          JSON.stringify({ error: "Order not found" }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 404 }
        );
      }

      if (order.escrow_status !== "held") {
        return new Response(
          JSON.stringify({ error: "Cannot dispute: escrow already released or refunded" }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 400 }
        );
      }

      if (order.payment_status !== "paid") {
        return new Response(
          JSON.stringify({ error: "Cannot dispute: order not paid" }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 400 }
        );
      }

      // Check for existing dispute
      const { data: existingDispute } = await supabase
        .from("disputes")
        .select("id")
        .eq("order_id", orderId)
        .in("status", ["open", "under_review"])
        .single();

      if (existingDispute) {
        return new Response(
          JSON.stringify({ error: "A dispute already exists for this order" }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 400 }
        );
      }

      // Create dispute
      const { data: dispute, error: disputeError } = await supabase
        .from("disputes")
        .insert({
          order_id: orderId,
          buyer_id: user.id,
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

      console.log(`Dispute created: ${dispute.id} for order ${orderId}`);

      return new Response(
        JSON.stringify({
          success: true,
          data: dispute,
          message: "Dispute opened. The seller will be notified.",
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 201 }
      );
    }

    // PATCH - Respond to dispute (seller)
    if (req.method === "PATCH" && isUUID) {
      const body = await req.json();
      const { response } = body;

      if (!response) {
        return new Response(
          JSON.stringify({ error: "Response message is required" }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 400 }
        );
      }

      // Get dispute
      const { data: dispute, error: disputeError } = await supabase
        .from("disputes")
        .select("*")
        .eq("id", disputeId)
        .eq("seller_id", user.id)
        .eq("status", "open")
        .single();

      if (disputeError || !dispute) {
        return new Response(
          JSON.stringify({ error: "Dispute not found or cannot be updated" }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 404 }
        );
      }

      // Update dispute
      const { data: updated, error: updateError } = await supabase
        .from("disputes")
        .update({
          seller_response: response,
          status: "under_review",
          updated_at: new Date().toISOString(),
        })
        .eq("id", disputeId)
        .select()
        .single();

      if (updateError) {
        console.error("Dispute update error:", updateError);
        throw new Error("Failed to update dispute");
      }

      console.log(`Dispute ${disputeId} updated with seller response`);

      return new Response(
        JSON.stringify({
          success: true,
          data: updated,
          message: "Response submitted. An admin will review the dispute.",
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 200 }
      );
    }

    return new Response(
      JSON.stringify({ error: "Method not allowed" }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 405 }
    );

  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    console.error("Disputes API error:", error);
    return new Response(
      JSON.stringify({ success: false, error: errorMessage }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 500 }
    );
  }
});
