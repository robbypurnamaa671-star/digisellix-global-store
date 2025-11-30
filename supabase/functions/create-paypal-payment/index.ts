import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface PaymentRequest {
  orderId: string;
  amount: number;
  currency: string;
  returnUrl: string;
  cancelUrl: string;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      {
        global: {
          headers: { Authorization: req.headers.get('Authorization')! },
        },
      }
    );

    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      throw new Error('Unauthorized');
    }

    const { orderId, amount, currency, returnUrl, cancelUrl }: PaymentRequest = await req.json();

    console.log('Creating PayPal payment for order:', orderId);

    const clientId = Deno.env.get('PAYPAL_CLIENT_ID');
    const secretKey = Deno.env.get('PAYPAL_SECRET_KEY');
    const paypalApiUrl = 'https://api-m.sandbox.paypal.com'; // Use 'https://api-m.paypal.com' for production

    if (!clientId || !secretKey) {
      throw new Error('PayPal credentials not configured');
    }

    // Get PayPal access token
    const authResponse = await fetch(`${paypalApiUrl}/v1/oauth2/token`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Authorization': `Basic ${btoa(`${clientId}:${secretKey}`)}`,
      },
      body: 'grant_type=client_credentials',
    });

    if (!authResponse.ok) {
      const errorText = await authResponse.text();
      console.error('PayPal auth error:', errorText);
      throw new Error('Failed to authenticate with PayPal');
    }

    const authData = await authResponse.json();
    const accessToken = authData.access_token;

    // Create PayPal order
    const orderResponse = await fetch(`${paypalApiUrl}/v2/checkout/orders`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${accessToken}`,
      },
      body: JSON.stringify({
        intent: 'CAPTURE',
        purchase_units: [{
          reference_id: orderId,
          amount: {
            currency_code: currency,
            value: amount.toFixed(2),
          },
        }],
        application_context: {
          return_url: returnUrl,
          cancel_url: cancelUrl,
          brand_name: 'Digisellix',
          landing_page: 'NO_PREFERENCE',
          user_action: 'PAY_NOW',
        },
      }),
    });

    if (!orderResponse.ok) {
      const errorText = await orderResponse.text();
      console.error('PayPal order creation error:', errorText);
      throw new Error('Failed to create PayPal order');
    }

    const orderData = await orderResponse.json();
    console.log('PayPal order created:', orderData.id);

    // Update order with PayPal details
    const { error: updateError } = await supabase
      .from('orders')
      .update({
        payment_method: 'paypal',
        ipaymu_session_id: orderData.id, // Reusing this field for PayPal order ID
        payment_status: 'pending',
      })
      .eq('id', orderId);

    if (updateError) {
      console.error('Error updating order:', updateError);
      throw updateError;
    }

    // Get approval URL
    const approvalUrl = orderData.links.find((link: any) => link.rel === 'approve')?.href;

    return new Response(
      JSON.stringify({
        success: true,
        paypalOrderId: orderData.id,
        approvalUrl: approvalUrl,
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    );
  } catch (error) {
    console.error('Error in create-paypal-payment:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400,
      }
    );
  }
});