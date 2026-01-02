import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

/**
 * Verify PayPal webhook signature
 * Uses PayPal's verification endpoint to validate webhook authenticity
 */
async function verifyPayPalWebhook(
  req: Request,
  body: string
): Promise<boolean> {
  const webhookId = Deno.env.get('PAYPAL_WEBHOOK_ID');
  const clientId = Deno.env.get('PAYPAL_CLIENT_ID');
  const secretKey = Deno.env.get('PAYPAL_SECRET_KEY');
  
  if (!webhookId || !clientId || !secretKey) {
    console.error('Missing PayPal configuration for webhook verification');
    return false;
  }

  // Extract PayPal signature headers
  const transmissionId = req.headers.get('paypal-transmission-id');
  const transmissionTime = req.headers.get('paypal-transmission-time');
  const transmissionSig = req.headers.get('paypal-transmission-sig');
  const certUrl = req.headers.get('paypal-cert-url');
  const authAlgo = req.headers.get('paypal-auth-algo');

  if (!transmissionId || !transmissionTime || !transmissionSig || !certUrl || !authAlgo) {
    console.error('Missing PayPal signature headers');
    return false;
  }

  // Validate cert URL is from PayPal
  try {
    const certUrlParsed = new URL(certUrl);
    if (!certUrlParsed.hostname.endsWith('.paypal.com')) {
      console.error('Invalid PayPal certificate URL domain:', certUrlParsed.hostname);
      return false;
    }
  } catch {
    console.error('Invalid PayPal certificate URL');
    return false;
  }

  try {
    // Get OAuth token for PayPal API
    const isProduction = Deno.env.get('PAYPAL_ENVIRONMENT') === 'production';
    const baseUrl = isProduction 
      ? 'https://api-m.paypal.com'
      : 'https://api-m.sandbox.paypal.com';

    const authResponse = await fetch(`${baseUrl}/v1/oauth2/token`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Authorization': `Basic ${btoa(`${clientId}:${secretKey}`)}`,
      },
      body: 'grant_type=client_credentials',
    });

    if (!authResponse.ok) {
      console.error('Failed to get PayPal OAuth token');
      return false;
    }

    const { access_token } = await authResponse.json();

    // Verify webhook signature using PayPal API
    const verifyResponse = await fetch(`${baseUrl}/v1/notifications/verify-webhook-signature`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${access_token}`,
      },
      body: JSON.stringify({
        auth_algo: authAlgo,
        cert_url: certUrl,
        transmission_id: transmissionId,
        transmission_sig: transmissionSig,
        transmission_time: transmissionTime,
        webhook_id: webhookId,
        webhook_event: JSON.parse(body),
      }),
    });

    if (!verifyResponse.ok) {
      console.error('PayPal webhook verification request failed:', await verifyResponse.text());
      return false;
    }

    const verifyResult = await verifyResponse.json();
    const isValid = verifyResult.verification_status === 'SUCCESS';
    
    if (!isValid) {
      console.error('PayPal webhook signature verification failed:', verifyResult.verification_status);
    }
    
    return isValid;
  } catch (error) {
    console.error('Error verifying PayPal webhook:', error);
    return false;
  }
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Clone request to read body twice (for verification and processing)
    const bodyText = await req.text();
    
    // Verify webhook signature FIRST before processing
    const isValid = await verifyPayPalWebhook(req, bodyText);
    
    if (!isValid) {
      console.error('PayPal webhook signature verification failed - rejecting request');
      return new Response(
        JSON.stringify({ error: 'Invalid webhook signature' }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 401,
        }
      );
    }

    console.log('PayPal webhook signature verified successfully');

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const webhookData = JSON.parse(bodyText);
    console.log('PayPal webhook received:', JSON.stringify(webhookData, null, 2));

    const eventType = webhookData.event_type;

    // Handle different PayPal webhook events
    if (eventType === 'CHECKOUT.ORDER.APPROVED' || eventType === 'PAYMENT.CAPTURE.COMPLETED') {
      const resource = webhookData.resource;
      const paypalOrderId = resource.id || resource.supplementary_data?.related_ids?.order_id;
      
      if (!paypalOrderId) {
        console.error('No PayPal order ID found in webhook');
        throw new Error('No PayPal order ID found');
      }

      console.log('Processing payment for PayPal order:', paypalOrderId);

      // Find order by PayPal order ID (stored in ipaymu_session_id field)
      const { data: order, error: fetchError } = await supabase
        .from('orders')
        .select('*')
        .eq('ipaymu_session_id', paypalOrderId)
        .single();

      if (fetchError || !order) {
        console.error('Order not found for PayPal ID:', paypalOrderId, fetchError);
        throw new Error('Order not found');
      }

      // Get capture ID and custom data (includes feePayer)
      const captureId = resource.purchase_units?.[0]?.payments?.captures?.[0]?.id || resource.id;
      const customIdRaw = resource.purchase_units?.[0]?.custom_id;
      let feePayer = order.fee_payer || 'buyer';
      
      // Parse custom_id if available
      if (customIdRaw) {
        try {
          const customData = JSON.parse(customIdRaw);
          feePayer = customData.feePayer || feePayer;
        } catch (e) {
          console.log('Could not parse custom_id, using order fee_payer');
        }
      }

      // Get platform fee from settings (default 5%)
      const { data: feeSettings } = await supabase
        .from('platform_settings')
        .select('value')
        .eq('key', 'platform_fee_percent')
        .single();

      const platformFeePercent = feeSettings?.value ? Number(feeSettings.value) : 5;
      
      // Calculate amounts based on fee_payer
      const basePrice = Number(order.amount_usd);
      const platformFee = Math.round((basePrice * platformFeePercent) / 100 * 100) / 100;

      let escrowAmount: number;
      let sellerPayout: number;

      if (feePayer === 'buyer') {
        escrowAmount = basePrice + platformFee;
        sellerPayout = basePrice;
      } else {
        escrowAmount = basePrice;
        sellerPayout = basePrice - platformFee;
      }

      console.log(`Escrow calculation - Fee payer: ${feePayer}, Base: $${basePrice}, Fee: $${platformFee}, Escrow: $${escrowAmount}, Seller payout: $${sellerPayout}`);

      // Get auto-release days from settings
      const { data: releaseSettings } = await supabase
        .from('platform_settings')
        .select('value')
        .eq('key', 'auto_release_days')
        .single();

      const autoReleaseDays = releaseSettings?.value ? Number(releaseSettings.value) : 7;
      const autoReleaseAt = new Date(Date.now() + autoReleaseDays * 24 * 60 * 60 * 1000).toISOString();

      // Create transaction with escrow details
      const { error: txError } = await supabase
        .from('transactions')
        .insert({
          order_id: order.id,
          payment_reference: captureId,
          payment_provider: 'paypal',
          amount: escrowAmount,
          escrow_amount: escrowAmount,
          platform_fee: platformFee,
          seller_payout: sellerPayout,
          fee_payer: feePayer,
          payout_status: 'frozen', // Held in escrow
        });

      if (txError) {
        console.error('Error creating transaction:', txError);
      }

      // Update order status with escrow info
      const { error: updateError } = await supabase
        .from('orders')
        .update({
          payment_status: 'paid',
          paid_at: new Date().toISOString(),
          ipaymu_transaction_id: captureId,
          escrow_status: 'held',
          fee_payer: feePayer,
          platform_fee_percent: platformFeePercent,
          auto_release_at: autoReleaseAt,
        })
        .eq('id', order.id);

      if (updateError) {
        console.error('Error updating order:', updateError);
        throw updateError;
      }

      console.log(`Order ${order.id} updated - Escrow held, auto-release at ${autoReleaseAt}`);

      // Calculate and create affiliate commission if referred
      if (order.referred_by && order.product_id) {
        try {
          // Get product commission rate
          const { data: product } = await supabase
            .from('products')
            .select('affiliate_enabled, affiliate_commission_percent, price_usd')
            .eq('id', order.product_id)
            .single();

          if (product?.affiliate_enabled) {
            const commissionPercent = product.affiliate_commission_percent || 10;
            const commissionAmount = (Number(product.price_usd) * commissionPercent) / 100;
            const availableAt = new Date();
            availableAt.setDate(availableAt.getDate() + 7); // 7 day refund window

            await supabase.from('affiliate_commissions').insert({
              affiliate_id: order.referred_by,
              order_id: order.id,
              product_id: order.product_id,
              commission_amount: commissionAmount,
              status: 'pending',
              available_at: availableAt.toISOString(),
            });

            console.log('Affiliate commission created:', commissionAmount);
          }
        } catch (commError) {
          console.error('Error creating affiliate commission:', commError);
        }
      }

      return new Response(
        JSON.stringify({ 
          success: true, 
          message: 'Payment processed and held in escrow',
          escrow_status: 'held',
          fee_payer: feePayer,
        }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 200,
        }
      );
    }

    // Handle payment failures
    if (eventType === 'PAYMENT.CAPTURE.DENIED' || eventType === 'CHECKOUT.ORDER.VOIDED') {
      const resource = webhookData.resource;
      const paypalOrderId = resource.id || resource.supplementary_data?.related_ids?.order_id;

      if (paypalOrderId) {
        const { data: order } = await supabase
          .from('orders')
          .select('*')
          .eq('ipaymu_session_id', paypalOrderId)
          .single();

        if (order) {
          await supabase
            .from('orders')
            .update({ payment_status: 'failed' })
            .eq('id', order.id);
        }
      }
    }

    return new Response(
      JSON.stringify({ success: true, message: 'Webhook received' }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    );
  } catch (error) {
    console.error('Error in paypal-webhook:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400,
      }
    );
  }
});
