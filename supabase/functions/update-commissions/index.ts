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
    console.log('Starting commission status update...');

    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
      {
        auth: {
          persistSession: false,
        },
      }
    );

    // Update pending commissions where available_at has passed
    const { data: updatedCommissions, error } = await supabaseClient
      .from('affiliate_commissions')
      .update({ status: 'available' })
      .eq('status', 'pending')
      .lte('available_at', new Date().toISOString())
      .select();

    if (error) {
      console.error('Error updating commissions:', error);
      throw error;
    }

    const count = updatedCommissions?.length || 0;
    console.log(`Updated ${count} commissions from pending to available`);

    // Send email notifications for each updated commission
    if (updatedCommissions && updatedCommissions.length > 0) {
      // Group commissions by affiliate_id and sum amounts
      const affiliateAmounts = updatedCommissions.reduce((acc: Record<string, number>, comm: any) => {
        const id = comm.affiliate_id;
        acc[id] = (acc[id] || 0) + Number(comm.commission_amount);
        return acc;
      }, {});

      console.log(`Sending notifications to ${Object.keys(affiliateAmounts).length} affiliates`);

      // Send notification to each affiliate
      for (const [affiliateId, totalAmount] of Object.entries(affiliateAmounts)) {
        try {
          const notifyResponse = await fetch(
            `${Deno.env.get('SUPABASE_URL')}/functions/v1/send-affiliate-notification`,
            {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')}`,
              },
              body: JSON.stringify({
                type: 'commission_available',
                affiliate_id: affiliateId,
                amount: totalAmount,
              }),
            }
          );
          console.log(`Notification sent for affiliate ${affiliateId}:`, await notifyResponse.json());
        } catch (notifyError) {
          console.error(`Failed to send notification for affiliate ${affiliateId}:`, notifyError);
        }
      }
    }

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: `Updated ${count} commissions to available`,
        updated: count 
      }),
      {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  } catch (error: any) {
    console.error('Error in update-commissions:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});
