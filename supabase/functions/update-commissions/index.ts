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
