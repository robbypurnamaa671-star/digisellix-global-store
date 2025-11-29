import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log('iPaymu webhook received');

    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
      {
        auth: {
          persistSession: false,
        },
      }
    );

    const payload = await req.json();
    console.log('Webhook payload:', payload);

    // iPaymu sends status_code to indicate payment status
    // 1 = Berhasil (Success)
    // 0 = Pending
    // -1 = Expired
    // -2 = Failed

    const statusCode = payload.status_code;
    const referenceId = payload.reference_id; // This is our order ID
    const transactionId = payload.trx_id;

    if (!referenceId) {
      throw new Error('Missing reference_id in webhook payload');
    }

    let paymentStatus = 'pending';
    if (statusCode === 1) {
      paymentStatus = 'paid';
    } else if (statusCode === -1 || statusCode === -2) {
      paymentStatus = 'failed';
    }

    console.log(`Processing payment for order ${referenceId}, status: ${paymentStatus}`);

    // Update order status
    const { data: order, error: updateError } = await supabaseClient
      .from('orders')
      .update({
        payment_status: paymentStatus,
        paid_at: paymentStatus === 'paid' ? new Date().toISOString() : null,
        ipaymu_transaction_id: transactionId,
      })
      .eq('id', referenceId)
      .select()
      .single();

    if (updateError) {
      console.error('Error updating order:', updateError);
      throw updateError;
    }

    console.log('Order updated successfully:', order);

    // The trigger create_download_access will automatically create download access
    // when payment_status changes to 'paid'

    return new Response(
      JSON.stringify({ success: true, message: 'Webhook processed successfully' }),
      {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  } catch (error: any) {
    console.error('Error in ipaymu-webhook:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});
