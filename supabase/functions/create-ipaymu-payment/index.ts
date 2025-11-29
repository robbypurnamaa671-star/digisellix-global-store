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
  buyerName: string;
  buyerEmail: string;
  buyerPhone: string;
  productTitle: string;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      {
        auth: {
          persistSession: false,
        },
      }
    );

    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      throw new Error('Missing authorization header');
    }

    const { data: { user }, error: authError } = await supabaseClient.auth.getUser(
      authHeader.replace('Bearer ', '')
    );

    if (authError || !user) {
      throw new Error('Unauthorized');
    }

    const { orderId, amount, currency, buyerName, buyerEmail, buyerPhone, productTitle }: PaymentRequest = await req.json();

    console.log('Creating iPaymu payment for order:', orderId);

    const vaNumber = Deno.env.get('IPAYMU_VA_NUMBER');
    const apiKey = Deno.env.get('IPAYMU_API_KEY');

    if (!vaNumber || !apiKey) {
      throw new Error('iPaymu credentials not configured');
    }

    // Create signature for iPaymu authentication
    const bodyData = {
      name: buyerName,
      phone: buyerPhone,
      email: buyerEmail,
      amount: Math.round(amount),
      notifyUrl: `${Deno.env.get('SUPABASE_URL')}/functions/v1/ipaymu-webhook`,
      expired: 24, // 24 hours expiration
      comments: `Payment for ${productTitle}`,
      referenceId: orderId,
      paymentMethod: 'va', // Virtual account, bank transfer, e-wallet
      paymentChannel: 'bag', // Bank aggregator (supports multiple banks)
    };

    const bodyParam = JSON.stringify(bodyData);
    const stringToSign = `POST:${vaNumber}:${bodyParam}:${apiKey}`;
    
    // Create HMAC SHA256 signature
    const encoder = new TextEncoder();
    const keyData = encoder.encode(apiKey);
    const messageData = encoder.encode(stringToSign);
    
    const cryptoKey = await crypto.subtle.importKey(
      'raw',
      keyData,
      { name: 'HMAC', hash: 'SHA-256' },
      false,
      ['sign']
    );
    
    const signature = await crypto.subtle.sign('HMAC', cryptoKey, messageData);
    const signatureHex = Array.from(new Uint8Array(signature))
      .map(b => b.toString(16).padStart(2, '0'))
      .join('');

    console.log('Calling iPaymu Direct Payment API');

    // Call iPaymu Direct Payment API
    const ipaymuResponse = await fetch('https://my.ipaymu.com/api/v2/payment/direct', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'va': vaNumber,
        'signature': signatureHex,
      },
      body: bodyParam,
    });

    const ipaymuData = await ipaymuResponse.json();

    console.log('iPaymu response:', ipaymuData);

    if (!ipaymuResponse.ok || ipaymuData.Status !== 200) {
      throw new Error(ipaymuData.Message || 'Failed to create iPaymu payment');
    }

    // Update order with iPaymu transaction details
    const { error: updateError } = await supabaseClient
      .from('orders')
      .update({
        ipaymu_transaction_id: ipaymuData.Data.TransactionId,
        ipaymu_session_id: ipaymuData.Data.SessionId,
        ipaymu_payment_url: ipaymuData.Data.PaymentUrl || null,
        payment_method: 'ipaymu',
        expires_at: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(), // 24 hours
      })
      .eq('id', orderId);

    if (updateError) {
      console.error('Error updating order:', updateError);
      throw updateError;
    }

    console.log('Payment created successfully for order:', orderId);

    return new Response(
      JSON.stringify({
        success: true,
        data: {
          transactionId: ipaymuData.Data.TransactionId,
          sessionId: ipaymuData.Data.SessionId,
          paymentUrl: ipaymuData.Data.PaymentUrl,
          paymentCode: ipaymuData.Data.PaymentCode,
          paymentName: ipaymuData.Data.PaymentName,
          fee: ipaymuData.Data.Fee,
          total: ipaymuData.Data.Total,
          expired: ipaymuData.Data.Expired,
        },
      }),
      {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  } catch (error: any) {
    console.error('Error in create-ipaymu-payment:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});
