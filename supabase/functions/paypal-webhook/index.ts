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
      const { data: orders, error: fetchError } = await supabase
        .from('orders')
        .select('*')
        .eq('ipaymu_session_id', paypalOrderId)
        .single();

      if (fetchError || !orders) {
        console.error('Order not found for PayPal ID:', paypalOrderId, fetchError);
        throw new Error('Order not found');
      }

      // Capture transaction ID
      const captureId = resource.purchase_units?.[0]?.payments?.captures?.[0]?.id || resource.id;

      // Update order status
      const { error: updateError } = await supabase
        .from('orders')
        .update({
          payment_status: 'paid',
          paid_at: new Date().toISOString(),
          ipaymu_transaction_id: captureId,
        })
        .eq('id', orders.id);

      if (updateError) {
        console.error('Error updating order:', updateError);
        throw updateError;
      }

      console.log('Order updated successfully:', orders.id);

      // Calculate and create affiliate commission if referred
      if (orders.referred_by && orders.product_id) {
        try {
          // Get product commission rate
          const { data: product } = await supabase
            .from('products')
            .select('affiliate_enabled, affiliate_commission_percent, price_usd')
            .eq('id', orders.product_id)
            .single();

          if (product?.affiliate_enabled) {
            const commissionPercent = product.affiliate_commission_percent || 10;
            const commissionAmount = (Number(product.price_usd) * commissionPercent) / 100;
            const availableAt = new Date();
            availableAt.setDate(availableAt.getDate() + 7); // 7 day refund window

            await supabase.from('affiliate_commissions').insert({
              affiliate_id: orders.referred_by,
              order_id: orders.id,
              product_id: orders.product_id,
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
        JSON.stringify({ success: true, message: 'Payment processed' }),
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
        const { data: orders } = await supabase
          .from('orders')
          .select('*')
          .eq('ipaymu_session_id', paypalOrderId)
          .single();

        if (orders) {
          await supabase
            .from('orders')
            .update({ payment_status: 'failed' })
            .eq('id', orders.id);
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
