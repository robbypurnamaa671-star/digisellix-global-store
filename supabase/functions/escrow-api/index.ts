import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface CreateEscrowRequest {
  sellerEmail: string;
  title: string;
  description?: string;
  amountUsd: number;
  amountIdr: number;
  currency: string;
  feePayer: "buyer" | "seller" | "split";
}

interface AcceptEscrowRequest {
  escrowId: string;
}

interface FundEscrowRequest {
  escrowId: string;
  paymentMethod: string;
  paymentReference: string;
}

interface DeliverEscrowRequest {
  escrowId: string;
}

interface ConfirmDeliveryRequest {
  escrowId: string;
}

interface DisputeEscrowRequest {
  escrowId: string;
  reason: string;
}

interface ResolveDisputeRequest {
  escrowId: string;
  inFavorOf: "buyer" | "seller";
  notes: string;
}

interface CancelEscrowRequest {
  escrowId: string;
}

interface SendMessageRequest {
  escrowId: string;
  message: string;
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

    const { data: authData, error: authError } = await supabase.auth.getUser(authHeader);
    if (authError || !authData.user) {
      throw new Error("Unauthorized");
    }
    const user = authData.user;

    const url = new URL(req.url);
    const action = url.pathname.split("/").pop();
    const body = req.method !== "GET" ? await req.json() : {};

    console.log(`Escrow API action: ${action}, user: ${user.id}`);

    // Get platform fee from settings
    const { data: feeSettings } = await supabase
      .from("platform_settings")
      .select("value")
      .eq("key", "platform_fee_percent")
      .single();
    const platformFeePercent = feeSettings?.value ? Number(feeSettings.value) : 5;

    // Get auto-release days from settings
    const { data: releaseSettings } = await supabase
      .from("platform_settings")
      .select("value")
      .eq("key", "auto_release_days")
      .single();
    const autoReleaseDays = releaseSettings?.value ? Number(releaseSettings.value) : 7;

    // Check if user is admin
    const { data: adminRole } = await supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", user.id)
      .eq("role", "admin")
      .single();
    const isAdmin = !!adminRole;

    // Helper function to add timeline event
    async function addTimelineEvent(
      escrowId: string,
      eventType: string,
      description: string,
      actorId: string | null,
      actorRole: string,
      metadata?: Record<string, unknown>
    ) {
      await supabase.from("escrow_timeline").insert({
        escrow_id: escrowId,
        event_type: eventType,
        event_description: description,
        actor_id: actorId,
        actor_role: actorRole,
        metadata,
      });
    }

    // Helper function to add system message
    async function addSystemMessage(escrowId: string, message: string) {
      await supabase.from("escrow_messages").insert({
        escrow_id: escrowId,
        sender_id: user.id,
        sender_role: "admin",
        message,
        is_system_message: true,
      });
    }

    // Helper to get user role in escrow
    async function getUserRole(escrow: { buyer_id: string; seller_id: string | null; seller_email?: string | null }) {
      if (escrow.buyer_id === user.id) return "buyer";
      if (escrow.seller_id === user.id) return "seller";
      // Check if user is invited seller (email matches but not yet accepted)
      if (escrow.seller_email && user.email && escrow.seller_email === user.email) return "seller";
      if (isAdmin) return "admin";
      return null;
    }

    switch (action) {
      case "create": {
        const { sellerEmail, title, description, amountUsd, amountIdr, currency, feePayer } = body as CreateEscrowRequest;

        // Use the correct amount based on currency
        const baseAmount = currency === 'IDR' ? amountIdr : amountUsd;
        
        // Calculate fees based on fee payer
        const platformFee = Math.round((baseAmount * platformFeePercent) / 100 * 100) / 100;
        let escrowAmount: number;
        let sellerPayout: number;

        if (feePayer === "buyer") {
          escrowAmount = baseAmount + platformFee;
          sellerPayout = baseAmount;
        } else if (feePayer === "seller") {
          escrowAmount = baseAmount;
          sellerPayout = baseAmount - platformFee;
        } else {
          // Split fee
          const halfFee = platformFee / 2;
          escrowAmount = baseAmount + halfFee;
          sellerPayout = baseAmount - halfFee;
        }

        // Set expiry to 7 days from now
        const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();

        const { data: escrow, error: createError } = await supabase
          .from("escrow_transactions")
          .insert({
            buyer_id: user.id,
            seller_email: sellerEmail,
            title,
            description,
            amount_usd: amountUsd,
            amount_idr: amountIdr,
            currency,
            fee_payer: feePayer,
            platform_fee_percent: platformFeePercent,
            platform_fee: platformFee,
            escrow_amount: escrowAmount,
            seller_payout: sellerPayout,
            expires_at: expiresAt,
          })
          .select()
          .single();

        if (createError) {
          console.error("Create escrow error:", createError);
          throw new Error("Failed to create escrow transaction");
        }

        await addTimelineEvent(
          escrow.id,
          "created",
          `Escrow transaction created for ${title}`,
          user.id,
          "buyer",
          { amount: amountUsd, currency, sellerEmail }
        );

        await addSystemMessage(escrow.id, `Escrow transaction created. Waiting for seller (${sellerEmail}) to accept.`);

        // Check if seller is already registered and send in-site notification
        const { data: sellerUser } = await supabase.auth.admin.listUsers();
        const registeredSeller = sellerUser?.users?.find((u) => u.email === sellerEmail);
        
        if (registeredSeller) {
          // Get buyer profile for notification message
          const { data: buyerProfile } = await supabase
            .from("profiles")
            .select("full_name")
            .eq("id", user.id)
            .single();
          
          const buyerName = buyerProfile?.full_name || "A buyer";
          const amountDisplay = currency === 'IDR' 
            ? `Rp ${amountIdr.toLocaleString('id-ID')}` 
            : `$${amountUsd}`;
          
          // Create in-site notification for the seller
          await supabase.from("notifications").insert({
            user_id: registeredSeller.id,
            type: "escrow_invitation",
            title: "New Escrow Invitation",
            message: `${buyerName} has invited you to an escrow transaction "${title}" for ${amountDisplay}`,
            link: `/escrow/${escrow.id}`,
            metadata: {
              escrow_id: escrow.id,
              buyer_id: user.id,
              amount: currency === 'IDR' ? amountIdr : amountUsd,
              currency,
            },
          });
          
          console.log(`In-site notification sent to registered seller: ${sellerEmail}`);
        } else {
          console.log(`Seller ${sellerEmail} not registered - would need email invitation`);
        }

        return new Response(
          JSON.stringify({ success: true, escrow, sellerNotified: !!registeredSeller }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      case "accept": {
        const { escrowId } = body as AcceptEscrowRequest;

        // Get the escrow transaction
        const { data: escrow, error: escrowError } = await supabase
          .from("escrow_transactions")
          .select("*")
          .eq("id", escrowId)
          .single();

        if (escrowError || !escrow) {
          throw new Error("Escrow transaction not found");
        }

        if (escrow.status !== "pending") {
          throw new Error("Escrow is not in pending status");
        }

        // Get user email to match with seller_email
        const { data: userProfile } = await supabase.auth.getUser(authHeader);
        const userEmail = userProfile?.user?.email;

        if (escrow.seller_email !== userEmail && !isAdmin) {
          throw new Error("You are not authorized to accept this escrow");
        }

        // Update escrow with seller info
        const { error: updateError } = await supabase
          .from("escrow_transactions")
          .update({
            seller_id: user.id,
            status: "accepted",
            accepted_at: new Date().toISOString(),
          })
          .eq("id", escrowId);

        if (updateError) {
          throw new Error("Failed to accept escrow");
        }

        await addTimelineEvent(escrowId, "accepted", "Seller accepted the escrow transaction", user.id, "seller");
        await addSystemMessage(escrowId, "Seller has accepted the transaction. Waiting for buyer to fund the escrow.");

        return new Response(
          JSON.stringify({ success: true, message: "Escrow accepted" }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      case "fund": {
        const { escrowId, paymentMethod, paymentReference } = body as FundEscrowRequest;

        const { data: escrow, error: escrowError } = await supabase
          .from("escrow_transactions")
          .select("*")
          .eq("id", escrowId)
          .single();

        if (escrowError || !escrow) {
          throw new Error("Escrow transaction not found");
        }

        if (escrow.buyer_id !== user.id) {
          throw new Error("Only the buyer can fund this escrow");
        }

        if (escrow.status !== "accepted") {
          throw new Error("Escrow must be accepted by seller first");
        }

        const autoReleaseAt = new Date(Date.now() + autoReleaseDays * 24 * 60 * 60 * 1000).toISOString();

        const { error: updateError } = await supabase
          .from("escrow_transactions")
          .update({
            status: "funded",
            payment_status: "paid",
            payment_method: paymentMethod,
            payment_reference: paymentReference,
            funded_at: new Date().toISOString(),
            auto_release_at: autoReleaseAt,
          })
          .eq("id", escrowId);

        if (updateError) {
          throw new Error("Failed to fund escrow");
        }

        await addTimelineEvent(
          escrowId,
          "funded",
          `Buyer funded the escrow with ${escrow.escrow_amount} ${escrow.currency}`,
          user.id,
          "buyer",
          { paymentMethod, amount: escrow.escrow_amount }
        );
        await addSystemMessage(escrowId, `Payment received. Funds are now held in escrow. Seller can proceed with delivery. Auto-release in ${autoReleaseDays} days if no action taken.`);

        return new Response(
          JSON.stringify({ success: true, message: "Escrow funded", autoReleaseAt }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      case "deliver": {
        const { escrowId } = body as DeliverEscrowRequest;

        const { data: escrow, error: escrowError } = await supabase
          .from("escrow_transactions")
          .select("*")
          .eq("id", escrowId)
          .single();

        if (escrowError || !escrow) {
          throw new Error("Escrow transaction not found");
        }

        if (escrow.seller_id !== user.id) {
          throw new Error("Only the seller can mark as delivered");
        }

        if (escrow.status !== "funded") {
          throw new Error("Escrow must be funded first");
        }

        const { error: updateError } = await supabase
          .from("escrow_transactions")
          .update({
            status: "delivered",
            delivered_at: new Date().toISOString(),
          })
          .eq("id", escrowId);

        if (updateError) {
          throw new Error("Failed to update delivery status");
        }

        await addTimelineEvent(escrowId, "delivered", "Seller marked the item/service as delivered", user.id, "seller");
        await addSystemMessage(escrowId, "Seller has marked the transaction as delivered. Buyer, please confirm receipt to release the funds.");

        return new Response(
          JSON.stringify({ success: true, message: "Marked as delivered" }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      case "confirm": {
        const { escrowId } = body as ConfirmDeliveryRequest;

        const { data: escrow, error: escrowError } = await supabase
          .from("escrow_transactions")
          .select("*")
          .eq("id", escrowId)
          .single();

        if (escrowError || !escrow) {
          throw new Error("Escrow transaction not found");
        }

        if (escrow.buyer_id !== user.id && !isAdmin) {
          throw new Error("Only the buyer can confirm delivery");
        }

        if (escrow.status !== "delivered" && escrow.status !== "funded") {
          throw new Error("Invalid escrow status for confirmation");
        }

        const { error: updateError } = await supabase
          .from("escrow_transactions")
          .update({
            status: "completed",
            payment_status: "released",
            completed_at: new Date().toISOString(),
          })
          .eq("id", escrowId);

        if (updateError) {
          throw new Error("Failed to complete escrow");
        }

        await addTimelineEvent(
          escrowId,
          "completed",
          `Buyer confirmed receipt. ${escrow.seller_payout} ${escrow.currency} released to seller.`,
          user.id,
          "buyer",
          { sellerPayout: escrow.seller_payout }
        );
        await addSystemMessage(escrowId, `Transaction completed! Funds have been released to the seller. Thank you for using our escrow service.`);

        return new Response(
          JSON.stringify({ success: true, message: "Escrow completed, funds released" }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      case "dispute": {
        const { escrowId, reason } = body as DisputeEscrowRequest;

        const { data: escrow, error: escrowError } = await supabase
          .from("escrow_transactions")
          .select("*")
          .eq("id", escrowId)
          .single();

        if (escrowError || !escrow) {
          throw new Error("Escrow transaction not found");
        }

        const userRole = await getUserRole(escrow);
        if (!userRole || userRole === "admin") {
          throw new Error("Only buyer or seller can open a dispute");
        }

        if (!["funded", "delivered"].includes(escrow.status)) {
          throw new Error("Cannot dispute at this stage");
        }

        const { error: updateError } = await supabase
          .from("escrow_transactions")
          .update({
            status: "disputed",
            dispute_reason: reason,
            dispute_by: userRole,
            disputed_at: new Date().toISOString(),
          })
          .eq("id", escrowId);

        if (updateError) {
          throw new Error("Failed to open dispute");
        }

        await addTimelineEvent(
          escrowId,
          "disputed",
          `${userRole.charAt(0).toUpperCase() + userRole.slice(1)} opened a dispute: ${reason}`,
          user.id,
          userRole,
          { reason }
        );
        await addSystemMessage(escrowId, `⚠️ Dispute opened by ${userRole}. Reason: ${reason}. An admin will review this case.`);

        return new Response(
          JSON.stringify({ success: true, message: "Dispute opened" }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      case "resolve": {
        const { escrowId, inFavorOf, notes } = body as ResolveDisputeRequest;

        if (!isAdmin) {
          throw new Error("Only admins can resolve disputes");
        }

        const { data: escrow, error: escrowError } = await supabase
          .from("escrow_transactions")
          .select("*")
          .eq("id", escrowId)
          .single();

        if (escrowError || !escrow) {
          throw new Error("Escrow transaction not found");
        }

        if (escrow.status !== "disputed") {
          throw new Error("Escrow is not in disputed status");
        }

        const newStatus = inFavorOf === "buyer" ? "refunded" : "completed";
        const paymentStatus = inFavorOf === "buyer" ? "refunded" : "released";

        const { error: updateError } = await supabase
          .from("escrow_transactions")
          .update({
            status: newStatus,
            payment_status: paymentStatus,
            resolution_notes: notes,
            resolved_by: user.id,
            resolution_in_favor: inFavorOf,
            resolved_at: new Date().toISOString(),
          })
          .eq("id", escrowId);

        if (updateError) {
          throw new Error("Failed to resolve dispute");
        }

        const outcomeMsg = inFavorOf === "buyer"
          ? `Funds refunded to buyer.`
          : `Funds released to seller.`;

        await addTimelineEvent(
          escrowId,
          "resolved",
          `Admin resolved dispute in favor of ${inFavorOf}. ${outcomeMsg}`,
          user.id,
          "admin",
          { inFavorOf, notes }
        );
        await addSystemMessage(escrowId, `✅ Dispute resolved in favor of ${inFavorOf}. ${outcomeMsg} Admin notes: ${notes}`);

        return new Response(
          JSON.stringify({ success: true, message: `Dispute resolved in favor of ${inFavorOf}` }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      case "cancel": {
        const { escrowId } = body as CancelEscrowRequest;

        const { data: escrow, error: escrowError } = await supabase
          .from("escrow_transactions")
          .select("*")
          .eq("id", escrowId)
          .single();

        if (escrowError || !escrow) {
          throw new Error("Escrow transaction not found");
        }

        // Only buyer can cancel, and only before funding
        if (escrow.buyer_id !== user.id && !isAdmin) {
          throw new Error("Only the buyer or admin can cancel");
        }

        if (!["pending", "accepted"].includes(escrow.status)) {
          throw new Error("Cannot cancel escrow at this stage");
        }

        const { error: updateError } = await supabase
          .from("escrow_transactions")
          .update({
            status: "cancelled",
          })
          .eq("id", escrowId);

        if (updateError) {
          throw new Error("Failed to cancel escrow");
        }

        const cancelledBy = isAdmin ? "admin" : "buyer";
        await addTimelineEvent(escrowId, "cancelled", `Escrow cancelled by ${cancelledBy}`, user.id, cancelledBy);
        await addSystemMessage(escrowId, `Transaction cancelled.`);

        return new Response(
          JSON.stringify({ success: true, message: "Escrow cancelled" }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      case "message": {
        const { escrowId, message } = body as SendMessageRequest;

        const { data: escrow, error: escrowError } = await supabase
          .from("escrow_transactions")
          .select("*")
          .eq("id", escrowId)
          .single();

        if (escrowError || !escrow) {
          throw new Error("Escrow transaction not found");
        }

        const userRole = await getUserRole(escrow);
        if (!userRole) {
          throw new Error("You are not a participant in this escrow");
        }

        const { error: messageError } = await supabase.from("escrow_messages").insert({
          escrow_id: escrowId,
          sender_id: user.id,
          sender_role: userRole,
          message,
          is_system_message: false,
        });

        if (messageError) {
          throw new Error("Failed to send message");
        }

        return new Response(
          JSON.stringify({ success: true, message: "Message sent" }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      case "list": {
        let query = supabase.from("escrow_transactions").select("*");

        if (!isAdmin) {
          query = query.or(`buyer_id.eq.${user.id},seller_id.eq.${user.id}`);
        }

        const { data: escrows, error: listError } = await query.order("created_at", { ascending: false });

        if (listError) {
          throw new Error("Failed to fetch escrow transactions");
        }

        return new Response(
          JSON.stringify({ success: true, escrows }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      case "get": {
        const escrowId = url.searchParams.get("id");
        if (!escrowId) {
          throw new Error("Escrow ID required");
        }

        const { data: escrow, error: escrowError } = await supabase
          .from("escrow_transactions")
          .select("*")
          .eq("id", escrowId)
          .single();

        if (escrowError || !escrow) {
          throw new Error("Escrow transaction not found");
        }

        const userRole = await getUserRole(escrow);
        if (!userRole) {
          throw new Error("You are not authorized to view this escrow");
        }

        // Get messages
        const { data: messages } = await supabase
          .from("escrow_messages")
          .select("*")
          .eq("escrow_id", escrowId)
          .order("created_at", { ascending: true });

        // Get timeline
        const { data: timeline } = await supabase
          .from("escrow_timeline")
          .select("*")
          .eq("escrow_id", escrowId)
          .order("created_at", { ascending: true });

        // Get buyer and seller profiles
        const { data: buyerProfile } = await supabase
          .from("profiles")
          .select("full_name, avatar_url")
          .eq("id", escrow.buyer_id)
          .single();

        let sellerProfile = null;
        if (escrow.seller_id) {
          const { data: sp } = await supabase
            .from("profiles")
            .select("full_name, avatar_url")
            .eq("id", escrow.seller_id)
            .single();
          sellerProfile = sp;
        }

        return new Response(
          JSON.stringify({
            success: true,
            escrow,
            messages: messages || [],
            timeline: timeline || [],
            buyerProfile,
            sellerProfile,
            userRole,
          }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      default:
        throw new Error(`Unknown action: ${action}`);
    }
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    console.error("Escrow API error:", error);
    return new Response(
      JSON.stringify({ success: false, error: errorMessage }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 400 }
    );
  }
});
