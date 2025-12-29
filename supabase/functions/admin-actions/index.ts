import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface AdminActionRequest {
  action: 
    | "freeze_payout" 
    | "unfreeze_payout" 
    | "suspend_seller" 
    | "unsuspend_seller" 
    | "flag_product" 
    | "unflag_product"
    | "update_platform_fee"
    | "get_dashboard_stats";
  targetId?: string;
  reason?: string;
  value?: number;
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

    // Verify admin role
    const { data: adminRole } = await supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", user.id)
      .eq("role", "admin")
      .single();

    if (!adminRole) {
      throw new Error("Unauthorized: Admin access required");
    }

    const body: AdminActionRequest = await req.json();
    const { action, targetId, reason, value } = body;

    console.log(`Admin action: ${action} by ${user.id}`);

    switch (action) {
      case "freeze_payout": {
        if (!targetId || !reason) {
          throw new Error("Transaction ID and reason are required");
        }

        const { data, error } = await supabase.rpc("admin_freeze_payout", {
          p_transaction_id: targetId,
          p_reason: reason,
        });

        if (error) throw error;

        return new Response(
          JSON.stringify({ success: true, message: "Payout frozen" }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      case "unfreeze_payout": {
        if (!targetId) {
          throw new Error("Transaction ID is required");
        }

        await supabase
          .from("transactions")
          .update({ 
            payout_status: "pending",
            frozen_at: null,
            frozen_reason: null,
            frozen_by: null
          })
          .eq("id", targetId);

        // Log action
        await supabase.from("admin_actions").insert({
          admin_id: user.id,
          action_type: "unfreeze_payout",
          target_type: "transaction",
          target_id: targetId,
          details: { reason: reason || "Manual unfreeze" },
        });

        return new Response(
          JSON.stringify({ success: true, message: "Payout unfrozen" }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      case "suspend_seller": {
        if (!targetId || !reason) {
          throw new Error("Seller ID and reason are required");
        }

        const { data, error } = await supabase.rpc("admin_suspend_seller", {
          p_seller_id: targetId,
          p_reason: reason,
        });

        if (error) throw error;

        return new Response(
          JSON.stringify({ success: true, message: "Seller suspended" }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      case "unsuspend_seller": {
        if (!targetId) {
          throw new Error("Seller ID is required");
        }

        await supabase
          .from("seller_profiles")
          .update({ 
            is_suspended: false,
            suspended_at: null,
            suspended_reason: null
          })
          .eq("user_id", targetId);

        // Reactivate products
        await supabase
          .from("products")
          .update({ status: "published" })
          .eq("seller_id", targetId)
          .eq("status", "suspended");

        // Log action
        await supabase.from("admin_actions").insert({
          admin_id: user.id,
          action_type: "unsuspend_seller",
          target_type: "seller",
          target_id: targetId,
          details: { reason: reason || "Manual unsuspension" },
        });

        return new Response(
          JSON.stringify({ success: true, message: "Seller unsuspended" }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      case "flag_product": {
        if (!targetId || !reason) {
          throw new Error("Product ID and reason are required");
        }

        const { data, error } = await supabase.rpc("admin_flag_product", {
          p_product_id: targetId,
          p_reason: reason,
        });

        if (error) throw error;

        return new Response(
          JSON.stringify({ success: true, message: "Product flagged" }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      case "unflag_product": {
        if (!targetId) {
          throw new Error("Product ID is required");
        }

        await supabase
          .from("products")
          .update({ 
            status: "published",
            flagged_at: null,
            flagged_reason: null
          })
          .eq("id", targetId);

        // Log action
        await supabase.from("admin_actions").insert({
          admin_id: user.id,
          action_type: "unflag_product",
          target_type: "product",
          target_id: targetId,
          details: { reason: reason || "Manual unflag" },
        });

        return new Response(
          JSON.stringify({ success: true, message: "Product unflagged" }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      case "update_platform_fee": {
        if (value === undefined || value < 0 || value > 50) {
          throw new Error("Valid fee percentage (0-50) is required");
        }

        await supabase
          .from("platform_settings")
          .update({ 
            value: value,
            updated_by: user.id,
            updated_at: new Date().toISOString()
          })
          .eq("key", "platform_fee_percent");

        // Log action
        await supabase.from("admin_actions").insert({
          admin_id: user.id,
          action_type: "update_platform_fee",
          target_type: "settings",
          target_id: "00000000-0000-0000-0000-000000000000",
          details: { new_value: value },
        });

        return new Response(
          JSON.stringify({ success: true, message: `Platform fee updated to ${value}%` }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      case "get_dashboard_stats": {
        // Get comprehensive admin stats
        const [
          { count: totalOrders },
          { count: pendingDisputes },
          { count: totalSellers },
          { count: suspendedSellers },
          { data: recentTransactions },
          { data: platformSettings },
        ] = await Promise.all([
          supabase.from("orders").select("*", { count: "exact", head: true }),
          supabase.from("disputes").select("*", { count: "exact", head: true }).in("status", ["open", "under_review"]),
          supabase.from("seller_profiles").select("*", { count: "exact", head: true }),
          supabase.from("seller_profiles").select("*", { count: "exact", head: true }).eq("is_suspended", true),
          supabase.from("transactions").select("amount, platform_fee, created_at").order("created_at", { ascending: false }).limit(100),
          supabase.from("platform_settings").select("key, value"),
        ]);

        const totalRevenue = recentTransactions?.reduce((sum, tx) => sum + Number(tx.amount), 0) || 0;
        const totalFees = recentTransactions?.reduce((sum, tx) => sum + Number(tx.platform_fee), 0) || 0;

        return new Response(
          JSON.stringify({
            success: true,
            stats: {
              total_orders: totalOrders,
              pending_disputes: pendingDisputes,
              total_sellers: totalSellers,
              suspended_sellers: suspendedSellers,
              total_revenue: totalRevenue,
              platform_fees_collected: totalFees,
              settings: platformSettings?.reduce((acc, s) => ({ ...acc, [s.key]: s.value }), {}),
            },
          }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      default:
        throw new Error("Invalid action");
    }
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    console.error("Admin action error:", error);
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
